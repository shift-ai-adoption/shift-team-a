import pg from 'pg';
import { fields, InputError, responseMinutes, normalize } from './domain.js';
import { demoIncidents } from './demo-data.js';
// DATE is a calendar date, not an instant. Keep it independent of container timezone.
pg.types.setTypeParser(1082, value=>value);
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
const columns = fields.map(([key])=>key);
export class Conflict extends Error {}
export async function health() { await pool.query('SELECT 1'); }
export async function initializeDemoData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('incident-manager-demo-seed-v1'))");
    await client.query('CREATE TABLE IF NOT EXISTS demo_seed_runs (seed_name text PRIMARY KEY, inserted_at timestamptz NOT NULL DEFAULT now())');
    const { rows } = await client.query("SELECT 1 FROM demo_seed_runs WHERE seed_name='dashboard-1000-v1'");
    if (rows.length) { await client.query('COMMIT'); return 0; }
    const data = demoIncidents();
    const keys = ['node','output_at','message','file_name','pattern','log_line_count','grep_result','occurred_at','occurrence_type','business_type','cause','response_action','assignee','status','completed_on','operation_minutes','received_at','first_response_at','novelty','defect'];
    for (let start = 0; start < data.length; start += 100) {
      const batch = data.slice(start, start + 100);
      const params = [];
      const tuples = batch.map((row, index) => {
        const offset = index * (keys.length + 2);
        params.push('incident', ...keys.map(key => row[key]), row.request_key);
        return `(${Array.from({length: keys.length + 2}, (_, i) => `$${offset + i + 1}`).join(',')})`;
      });
      await client.query(`INSERT INTO incidents(record_type,${keys.join(',')},request_key) VALUES ${tuples.join(',')}`, params);
    }
    await client.query("INSERT INTO demo_seed_runs(seed_name) VALUES ('dashboard-1000-v1')");
    await client.query('COMMIT');
    return data.length;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function list({q='',status='',record_type=''}={}) {
  const result = await pool.query(`SELECT * FROM incidents WHERE deleted_at IS NULL
    AND ($1 = '' OR concat_ws(' ',id,node,message,business_type,cause,assignee) ILIKE '%' || $1 || '%')
    AND ($2 = '' OR status = $2) AND ($3 = '' OR record_type = $3) ORDER BY id DESC`, [q,status,record_type]);
  return result.rows.map(row=>({...row,first_response_minutes:responseMinutes(row)}));
}
export async function get(id) {
  const {rows} = await pool.query('SELECT * FROM incidents WHERE id=$1 AND deleted_at IS NULL',[id]);
  return rows[0];
}
export async function save(value,{id,version,requestKey}={}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result;
    if (id) {
      result = await client.query(`UPDATE incidents SET ${columns.map((c,i)=>`${c}=$${i+1}`).join(',')},
        version=version+1, updated_at=now() WHERE id=$${columns.length+1} AND version=$${columns.length+2} AND deleted_at IS NULL RETURNING *`,[...columns.map(c=>value[c]),id,version]);
      if (!result.rows.length) throw new Conflict('別の画面で更新されたか、削除されています。再読込して確認してください');
    } else {
      result = await client.query(`INSERT INTO incidents(${columns.join(',')},request_key) VALUES (${columns.map((_,i)=>`$${i+1}`).join(',')},$${columns.length+1}) ON CONFLICT(request_key) DO NOTHING RETURNING *`,[...columns.map(c=>value[c]),requestKey]);
      if (!result.rows.length) {
        const existing = await client.query('SELECT * FROM incidents WHERE request_key=$1',[requestKey]);
        const saved = existing.rows[0];
        const comparable = {...saved};
        for (const [key,item] of Object.entries(comparable)) if (item instanceof Date) comparable[key] = item.toISOString();
        const normalizedSaved = normalize(comparable);
        if (saved.deleted_at || columns.some(key=>normalizedSaved[key] !== value[key])) throw new Conflict('この登録要求は既に保存されています。一覧で確認し、別の事象は「新規作成」から登録してください');
        await client.query('COMMIT');
        return saved;
      }
    }
    const row = result.rows[0];
    await client.query('INSERT INTO incident_history(incident_id,action,snapshot) VALUES($1,$2,$3)',[row.id,id?'update':'create',JSON.stringify(row)]);
    await client.query('COMMIT');
    return row;
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}
export async function remove(id,version) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query('UPDATE incidents SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=$1 AND version=$2 AND deleted_at IS NULL RETURNING *',[id,version]);
    if (!rows.length) throw new Conflict('更新または削除されています。再読込してください');
    await client.query('INSERT INTO incident_history(incident_id,action,snapshot) VALUES($1,$2,$3)',[id,'delete',JSON.stringify(rows[0])]);
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}
export async function history(id) {
  return (await pool.query('SELECT id,action,created_at FROM incident_history WHERE incident_id=$1 ORDER BY id DESC',[id])).rows;
}
export async function settings(value) {
  if (value) {
    if (typeof value.external_send_allowed !== 'boolean' || typeof value.llm_log_allowed !== 'boolean') throw new InputError('設定値が不正です');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE app_settings SET external_send_allowed=$1,llm_log_allowed=$2,updated_at=now() WHERE id=1',[value.external_send_allowed,value.llm_log_allowed]);
      await client.query('INSERT INTO settings_history(external_send_allowed,llm_log_allowed) VALUES($1,$2)',[value.external_send_allowed,value.llm_log_allowed]);
      await client.query('COMMIT');
    } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
  }
  return {...(await pool.query('SELECT * FROM app_settings WHERE id=1')).rows[0],llm_connected:false,mode:'template'};
}
export async function saveDraft(id,version,body) {
  return (await pool.query('INSERT INTO report_drafts(incident_id,incident_version,body) VALUES($1,$2,$3) RETURNING *',[id,version,body])).rows[0];
}
export async function latestDraft(id) {
  return (await pool.query('SELECT * FROM report_drafts WHERE incident_id=$1 ORDER BY id DESC LIMIT 1',[id])).rows[0] || null;
}

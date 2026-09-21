import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export function validate(input) {
  const fields = ['type','name','kana','corporateNumber','representative','postalCode','prefecture','city','street','building','email','phone'];
  const value = Object.fromEntries(fields.map(k => [k, typeof input[k] === 'string' ? input[k].trim() : '']));
  const errors = {};
  for (const k of ['name','kana','postalCode','prefecture','city','street','email','phone']) if (!value[k]) errors[k] = '入力してください。';
  if (!['individual','corporation'].includes(value.type)) errors.type = '申請者区分を選択してください。';
  for (const k of fields) if (value[k].length > 200) errors[k] = '200文字以内で入力してください。';
  if (value.kana && !/^[ァ-ヶー\s・]+$/u.test(value.kana)) errors.kana = '全角カタカナで入力してください。';
  if (!/^\d{3}-?\d{4}$/.test(value.postalCode)) errors.postalCode = '郵便番号を7桁で入力してください。';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'メールアドレスの形式を確認してください。';
  if (!/^0[0-9-]{9,12}$/.test(value.phone) || ![10,11].includes(value.phone.replaceAll('-','').length)) errors.phone = '電話番号を10〜11桁で入力してください。';
  if (value.type === 'corporation') {
    if (!/^\d{13}$/.test(value.corporateNumber)) errors.corporateNumber = '法人番号を13桁の数字で入力してください。';
    if (!value.representative) errors.representative = '代表者氏名を入力してください。';
  } else { value.corporateNumber = ''; value.representative = ''; }
  return { value, errors };
}

export function createStore(path, seed = true) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS applicants (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, applicant TEXT NOT NULL, owner TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const unpack = row => row && ({ ...JSON.parse(row.data), id: row.id, version: row.version, createdAt: row.created, updatedAt: row.updated });
  function find(owner,id) { return unpack(db.prepare('SELECT * FROM applicants WHERE owner=? AND id=?').get(owner,id)); }
  function save(owner, value, id, version) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const previous = id ? find(owner,id) : null;
      if (id && !previous) throw Object.assign(new Error('申請者が見つかりません。'), {status:404});
      if (previous && version !== previous.version) throw Object.assign(new Error('別の画面で更新されています。一覧に戻り、最新の内容を開き直してください。'), {status:409});
      if (value.type === 'corporation') {
        const duplicate = db.prepare('SELECT id FROM applicants WHERE owner=? AND json_extract(data,\'$.corporateNumber\')=? AND id<>?').get(owner,value.corporateNumber,id || '');
        if (duplicate) throw Object.assign(new Error('この法人番号は登録済みです。'), {status:409});
      }
      const now = new Date().toISOString();
      id ||= randomUUID();
      db.prepare('INSERT INTO applicants VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated=excluded.updated')
        .run(id,owner,JSON.stringify(value),(previous?.version || 0)+1,previous?.createdAt || now,now);
      db.prepare('INSERT INTO audit (applicant,owner,action,at) VALUES (?,?,?,?)').run(id,owner,previous?'更新':'登録',now);
      db.exec('COMMIT'); return find(owner,id);
    } catch(e) { db.exec('ROLLBACK'); throw e; }
  }
  if (seed && !db.prepare('SELECT value FROM meta WHERE key=?').get('seeded')) {
    const common = {kana:'サンプル',postalCode:'100-0001',prefecture:'東京都',city:'千代田区',street:'千代田1-1',building:'',email:'sample@example.test',phone:'03-1234-5678',corporateNumber:'',representative:''};
    for (const v of [
      {type:'individual',name:'山田 太郎',kana:'ヤマダ タロウ',building:'サンプルハイツ 101'},
      {type:'corporation',name:'株式会社 みらい企画',kana:'カブシキガイシャ ミライキカク',corporateNumber:'1234567890123',representative:'山田 太郎',city:'中央区',street:'日本橋1-2-3',email:'info@mirai.example.test'},
      {type:'corporation',name:'一般社団法人 まちづくりの輪',kana:'イッパンシャダンホウジン マチヅクリノワ',corporateNumber:'2345678901234',representative:'山田 太郎',city:'新宿区',street:'西新宿2-3-4',email:'info@machi.example.test'}
    ]) save('demo-a',{...common,...v});
    db.prepare('INSERT INTO meta VALUES (?,?)').run('seeded','1');
  }
  return {
    db, find, save,
    list: owner => db.prepare('SELECT * FROM applicants WHERE owner=? ORDER BY updated DESC,id').all(owner).map(unpack),
    history: (owner,id) => db.prepare('SELECT action,at FROM audit WHERE owner=? AND applicant=? ORDER BY id DESC').all(owner,id),
    remove(owner,id,version) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const row = find(owner,id);
        if (!row) throw Object.assign(new Error('申請者が見つかりません。'), {status:404});
        if (row.version !== version) throw Object.assign(new Error('情報が更新されています。最新の内容を確認してから削除してください。'), {status:409});
        db.prepare('DELETE FROM applicants WHERE owner=? AND id=?').run(owner,id);
        db.prepare('INSERT INTO audit (applicant,owner,action,at) VALUES (?,?,?,?)').run(id,owner,'削除',new Date().toISOString());
        db.exec('COMMIT');
      } catch(e) { db.exec('ROLLBACK'); throw e; }
    }
  };
}

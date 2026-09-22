export const fields = [
  ['record_type','区分'],['node','ノード'],['output_at','出力日時'],['message','メッセージ'],
  ['file_name','ファイル名'],['pattern','パターン'],['log_line_count','ログ該当行数'],['grep_result','Grep結果'],
  ['occurred_at','発生日時'],['occurrence_type','発生種別'],['business_type','業務種別'],
  ['cause','原因'],['response_action','回答兼対処'],['assignee','担当者'],['status','ステータス'],
  ['completed_on','完了日付'],['operation_minutes','操作時間（分）'],['received_at','受付日時'],
  ['first_response_at','初回回答日時'],['novelty','新規／既出'],['defect','瑕疵の有無'],
  ['related_id','関連項番'],['source_message_id','元メールID'],['source_text','元メール本文']
];
export const dateFields = ['output_at','occurred_at','received_at','first_response_at'];
const integers = ['log_line_count','operation_minutes','related_id'];
const enums = {record_type:['incident','faq'],status:['未着手','対応中','保留','完了'],novelty:['未判定','新規','既出・再発'],defect:['未判定','有','無']};
export class InputError extends Error {}
export function normalize(input) {
  const value = {};
  for (const [key,label] of fields) {
    const raw = input[key];
    if (dateFields.includes(key)) {
      if (!raw) value[key] = null;
      else {
        if (typeof raw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(raw) || Number.isNaN(Date.parse(raw))) throw new InputError(`${label}はタイムゾーン付き日時が必要です`);
        value[key] = new Date(raw).toISOString();
      }
    } else if (key === 'completed_on') {
      value[key] = raw || null;
      if (raw && (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw)) || new Date(raw).toISOString().slice(0,10) !== raw)) throw new InputError('完了日付が不正です');
    } else if (integers.includes(key)) {
      value[key] = raw === '' || raw == null ? null : Number(raw);
      if (value[key] !== null && (!Number.isSafeInteger(value[key]) || value[key] < (key === 'related_id' ? 1 : 0))) throw new InputError(`${label}が不正です`);
    } else {
      if (raw != null && typeof raw !== 'string') throw new InputError(`${label}は文字列で指定してください`);
      value[key] = raw ?? '';
      if (value[key].length > 100000) throw new InputError(`${label}が長すぎます`);
    }
  }
  for (const [key,options] of Object.entries(enums)) {
    if (!value[key]) value[key] = options[0];
    if (!options.includes(value[key])) throw new InputError(`${key}の選択値が不正です`);
  }
  if (!value.message.trim()) throw new InputError('メッセージを入力してください');
  if (value.record_type === 'faq') value.cause = '';
  if (value.first_response_at && (!value.received_at || Date.parse(value.first_response_at) < Date.parse(value.received_at))) throw new InputError('初回回答日時は受付日時以降にしてください');
  if (value.status === '完了' && !value.completed_on) throw new InputError('完了日付を入力してください');
  return value;
}
export function responseMinutes(row) {
  return row.received_at && row.first_response_at ? Math.floor((new Date(row.first_response_at)-new Date(row.received_at))/60000) : null;
}
export function displayTime(value) {
  return value ? new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}) : '確認中';
}
// Deterministic extraction only. Never infer a cause or use message text as instructions.
export function extractMail(text) {
  const aliases = {'ノード':'node','出力日時':'output_at','メッセージ':'message','ファイル名':'file_name','パターン':'pattern','ログ該当行数':'log_line_count','Grep結果':'grep_result','grep結果':'grep_result','ログのGrep結果':'grep_result','発生日時':'occurred_at','発生種別':'occurrence_type','業務種別':'business_type','受付日時':'received_at','Message-ID':'source_message_id'};
  const result = {source_text:text};
  const warnings = [];
  let multiline = null;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:：]+)[:：]\s*(.*)$/);
    const key = match && aliases[match[1].trim()];
    if (key) {
      result[key] = match[2].trim();
      multiline = ['message','grep_result'].includes(key) ? key : null;
    } else if (multiline) result[multiline] += '\n' + line;
  }
  for (const key of dateFields) if (result[key]) {
    let date = result[key].replaceAll('/','-').replace(' ','T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(date)) {
      date += '+09:00';
      warnings.push(`${fields.find(f=>f[0]===key)[1]}は日本時間として解釈しました`);
    }
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(date) || Number.isNaN(Date.parse(date))) {delete result[key];warnings.push('解釈できない日時があります。原文を確認してください');}
    else result[key] = new Date(date).toISOString();
  }
  if (result.log_line_count && !/^\d+$/.test(result.log_line_count)) {delete result.log_line_count;warnings.push('ログ該当行数を確認してください');}
  if (!result.message) warnings.push('「メッセージ：」の行がありません。メッセージを入力してください');
  return {values:result,warnings};
}
export function draftReport(row) {
  const known = x => x?.trim() || '確認中';
  return `件名：【${row.record_type === 'faq' ? 'お問い合わせ' : 'インシデント'}報告】#${row.id} ${row.node || '対象確認中'}\n\n関係者各位\n\n以下のとおりご報告します。\n\n管理番号：${row.id}\n発生日時：${displayTime(row.occurred_at)}\n対象：${known(row.node)}\n業務：${known(row.business_type)}\n事象：${known(row.message)}\n影響：確認中\n対応状況：${row.status}\n${row.record_type === 'incident' ? `原因：${known(row.cause)}\n` : ''}回答・対処：${known(row.response_action)}\n今後の対応：確認中\n担当者：${known(row.assignee)}\n\n以上\n`;
}

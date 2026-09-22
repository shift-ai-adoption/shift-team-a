import test from 'node:test';
import assert from 'node:assert/strict';
import {extractMail,normalize,responseMinutes,draftReport} from '../src/domain.js';
test('Japanese log mail: timestamps are JST; multiline grep remains intact',()=>{
  const {values,warnings}=extractMail('ノード：demo\n発生日時：2026-09-19 09:00:00\nメッセージ：タイムアウト\nログ該当行数：2\nGrep結果：100 ERROR first\n101 ERROR second');
  assert.equal(values.occurred_at,'2026-09-19T00:00:00.000Z');
  assert.equal(values.grep_result,'100 ERROR first\n101 ERROR second');
  assert.equal(values.message,'タイムアウト');assert.ok(warnings.length);
});
test('Unknown formats are not invented',()=>{
  const {values,warnings}=extractMail('発生日時：不明\nログ該当行数：数件\n自由形式の本文');
  assert.equal(values.occurred_at,undefined);assert.equal(values.log_line_count,undefined);assert.ok(warnings.length>=2);
});
test('FAQ cannot accidentally retain incident cause',()=>{
  assert.equal(normalize({record_type:'faq',message:'質問',cause:'前の原因'}).cause,'');
});
test('First response is elapsed time, not draft creation time',()=>{
  assert.equal(responseMinutes({received_at:'2026-09-19T00:00:00Z',first_response_at:'2026-09-19T00:17:59Z'}),17);
  assert.equal(responseMinutes({received_at:'2026-09-19T00:00:00Z'}),null);
  assert.throws(()=>normalize({message:'事象',received_at:'2026-09-19T01:00:00Z',first_response_at:'2026-09-19T00:00:00Z'}));
});
test('Invalid counts, dates, completion and zoneless dates are rejected',()=>{
  for(const invalid of [{operation_minutes:-1},{log_line_count:1.5},{completed_on:'2026-02-30'},{status:'完了'},{occurred_at:'2026-09-19T09:00:00'}]) assert.throws(()=>normalize({message:'事象',...invalid}));
});
test('Template does not invent cause, impact or resolution',()=>{
  const text=draftReport({id:1,record_type:'incident',message:'接続不可',status:'対応中'});
  assert.match(text,/影響：確認中/);assert.match(text,/原因：確認中/);assert.match(text,/今後の対応：確認中/);
  assert.doesNotMatch(draftReport({id:2,record_type:'faq',message:'質問',status:'未着手'}),/原因：/);
});

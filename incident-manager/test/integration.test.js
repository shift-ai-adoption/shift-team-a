import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import ExcelJS from 'exceljs';
const enabled=process.env.RUN_INTEGRATION==='1';
const root=process.env.TEST_URL || 'http://localhost:3000';
async function call(path,method='GET',body){const response=await fetch(root+'/api'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};}
test('registration, replay, recurrence, conflict, drafts, settings and XLSX',{skip:!enabled},async()=>{
  const ids=[];const original=(await call('/settings')).body;
  try {
    const input={message:'=HYPERLINK("https://example.invalid")',node:'integration-'+randomUUID(),occurred_at:'2026-09-19T00:00:00Z',received_at:'2026-09-19T00:01:00Z',request_key:randomUUID()};
    const first=await call('/incidents','POST',input);assert.equal(first.status,201);ids.push(first.body.id);
    const replay=await call('/incidents','POST',input);assert.equal(replay.body.id,first.body.id);
    assert.equal((await call('/incidents','POST',{...input,message:'changed'})).status,409);
    const second=await call('/incidents','POST',{...input,occurred_at:'2026-09-20T00:00:00Z',request_key:randomUUID()});assert.equal(second.status,201);assert.notEqual(first.body.id,second.body.id);ids.push(second.body.id);
    const updated=await call('/incidents/'+first.body.id,'PUT',{...first.body,status:'対応中'});assert.equal(updated.status,200);assert.equal(updated.body.version,2);
    assert.equal((await call('/incidents/'+first.body.id,'PUT',{...first.body,status:'完了',completed_on:'2026-09-19'})).status,409);
    const report=await call(`/incidents/${first.body.id}/report`,'POST',{version:2});assert.equal(report.status,200);assert.match(report.body.body,/原因：確認中/);
    const reread=await call('/incidents/'+first.body.id);assert.equal(reread.body.first_response_at,null);
    const settings=await call('/settings','PUT',{external_send_allowed:true,llm_log_allowed:true});assert.equal(settings.body.llm_connected,false);assert.equal(settings.body.mode,'template');
    const response=await fetch(root+'/api/export.xlsx?q='+encodeURIComponent(input.node));assert.equal(response.status,200);
    const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await response.arrayBuffer()));const sheet=book.worksheets[0];assert.equal(sheet.rowCount,3);
    const headers=sheet.getRow(1).values;const messageCol=headers.indexOf('メッセージ');assert.equal(typeof sheet.getRow(2).getCell(messageCol).value,'string');assert.equal(sheet.getRow(2).getCell(messageCol).value,input.message);
    assert.ok(headers.includes('一次回答時間（分）'));
    const cross=await fetch(root+'/api/settings',{method:'PUT',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({external_send_allowed:true,llm_log_allowed:true})});assert.equal(cross.status,403);
  } finally {
    await call('/settings','PUT',{external_send_allowed:original.external_send_allowed,llm_log_allowed:original.llm_log_allowed});
    for(const id of ids){const result=await call('/incidents/'+id);if(result.status===200)await call('/incidents/'+id,'DELETE',{version:result.body.version});}
  }
});

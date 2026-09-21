import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';

const valid={type:'individual',name:'試験 太郎',kana:'シケン タロウ',postalCode:'100-0001',prefecture:'東京都',city:'千代田区',street:'1-1',email:'test@example.test',phone:'03-1234-5678'};
test('API CRUD, ownership, validation, concurrency and CSRF',async()=>{
 const store=createStore(':memory:',false),server=createApp(store,'test-secret').listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,method='GET',body,headers={})=>fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json','X-Workbench-Request':'1',...headers},body:body===undefined?undefined:JSON.stringify(body)});
 try{
  assert.equal((await request('/applicants','POST',{})).status,422);
  assert.equal((await request('/applicants','POST',valid,{'Origin':'https://evil.example'})).status,403);
  const response=await request('/applicants','POST',valid); assert.equal(response.status,201);
  const created=await response.json(); assert.equal(created.version,1);
  assert.equal((await (await request('/applicants')).json()).length,1);
  const switchResponse=await request('/session','POST',{id:'demo-b'});
  const cookie=switchResponse.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/applicants','GET',undefined,{cookie})).json()).length,0);
  for(const method of ['GET','PUT','DELETE']) assert.equal((await request('/applicants/'+created.id,method,method==='GET'?undefined:{...valid,version:1},{cookie})).status,404);
  const updated=await (await request('/applicants/'+created.id,'PUT',{...valid,name:'変更 太郎',version:1})).json(); assert.equal(updated.version,2);
  assert.equal((await request('/applicants/'+created.id,'PUT',{...valid,version:1})).status,409);
  assert.equal((await request('/applicants/'+created.id,'DELETE',{version:1})).status,409);
  const corporate={...valid,type:'corporation',corporateNumber:'1234567890123',representative:'代表 太郎'};
  assert.equal((await request('/applicants','POST',corporate)).status,201);
  assert.equal((await request('/applicants','POST',corporate)).status,409);
  assert.equal((await request('/applicants','POST',{...corporate,corporateNumber:'123'})).status,422);
  assert.equal((await request('/applicants','POST',{...valid,kana:'abc'})).status,422);
  const detail=await (await request('/applicants/'+created.id)).json(); assert.deepEqual(detail.history.map(x=>x.action),['更新','登録']);
  assert.equal((await request('/applicants/'+created.id,'DELETE',{version:2})).status,204);
  assert.equal((await request('/applicants/'+created.id)).status,404);
 }finally{await new Promise(r=>server.close(r));store.db.close()}
});

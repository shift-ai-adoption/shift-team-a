import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import ExcelJS from 'exceljs';
import * as repo from './repository.js';
import {fields,dateFields,normalize,InputError,extractMail,draftReport,displayTime} from './domain.js';
const publicDir = fileURLToPath(new URL('../public/',import.meta.url));
const files = {'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
const json = (res,status,value) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new InputError('JSON形式で送信してください');
  const chunks=[];let size=0;
  for await (const chunk of req) {size+=chunk.length;if(size>1024*1024) throw new InputError('入力は1MB以内にしてください');chunks.push(chunk);}
  try {const data=JSON.parse(Buffer.concat(chunks).toString());if (!data || Array.isArray(data) || typeof data !== 'object') throw Error();return data;}
  catch {throw new InputError('JSONが不正です');}
}
function validVersion(value) {if(!Number.isInteger(value)||value<1) throw new InputError('更新版数が不正です');return value;}
const server = http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    // Local prototype only. Reject cross-origin browser writes and DNS-rebinding hosts.
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return json(res,403,{error:'ローカル接続のみ利用できます'});
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res,403,{error:'別サイトからの操作は拒否しました'});
    const url=new URL(req.url,`http://${host}`); const path=url.pathname;
    if(req.method==='GET' && files[path]) {const [file,type]=files[path];res.setHeader('Content-Type',`${type}; charset=utf-8`);return res.end(await readFile(publicDir+file));}
    if(req.method==='GET' && path==='/api/health') {await repo.health();return json(res,200,{ok:true});}
    if(req.method==='GET' && path==='/api/settings') return json(res,200,await repo.settings());
    if(req.method==='PUT' && path==='/api/settings') return json(res,200,await repo.settings(await body(req)));
    if(req.method==='POST' && path==='/api/extract') {const input=await body(req);if(typeof input.text!=='string'||input.text.length>100000) throw new InputError('本文を10万文字以内で入力してください');return json(res,200,extractMail(input.text));}
    if(req.method==='GET' && path==='/api/incidents') return json(res,200,await repo.list(Object.fromEntries(url.searchParams)));
    if(req.method==='POST' && path==='/api/incidents') {
      const input=await body(req);
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_key||'')) throw new InputError('登録要求IDが不正です');
      return json(res,201,await repo.save(normalize(input),{requestKey:input.request_key}));
    }
    if(req.method==='GET' && path==='/api/export.xlsx') {
      const rows=await repo.list(Object.fromEntries(url.searchParams));
      const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('インシデント一覧');
      const exportFields=[['id','項番'],...fields.filter(([key])=>!['source_message_id','source_text'].includes(key)),['first_response_minutes','一次回答時間（分）']];
      sheet.columns=exportFields.map(([key,header])=>({key,header,width:['message','cause','response_action','grep_result'].includes(key)?45:20}));
      for(const row of rows) {
        const converted={...row,record_type:row.record_type==='faq'?'FAQ':'インシデント'};
        for(const key of dateFields) converted[key]=row[key]?displayTime(row[key]):'';
        // Text values are assigned as strings, never as spreadsheet formulas.
        sheet.addRow(converted);
      }
      sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
      sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF155E75'}};
      sheet.views=[{state:'frozen',ySplit:1}];
      sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:exportFields.length}};
      sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
      res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition','attachment; filename="incidents.xlsx"');
      return res.end(Buffer.from(await book.xlsx.writeBuffer()));
    }
    const match=path.match(/^\/api\/incidents\/(\d+)(?:\/(report|history))?$/);
    if(match) {
      const id=match[1];
      if(!Number.isSafeInteger(Number(id))) throw new InputError('項番が不正です');
      if(req.method==='PUT' && !match[2]) {const input=await body(req);return json(res,200,await repo.save(normalize(input),{id,version:validVersion(input.version)}));}
      if(req.method==='DELETE' && !match[2]) {const input=await body(req);await repo.remove(id,validVersion(input.version));return json(res,200,{ok:true});}
      const row=await repo.get(id);if(!row) return json(res,404,{error:'データが見つかりません'});
      if(req.method==='GET' && !match[2]) return json(res,200,row);
      if(req.method==='GET' && match[2]==='history') return json(res,200,await repo.history(id));
      if(req.method==='GET' && match[2]==='report') return json(res,200,await repo.latestDraft(id));
      if(req.method==='POST' && match[2]==='report') {
        const input=await body(req);
        if(validVersion(input.version)!==row.version) throw new repo.Conflict('データが更新されています。再読込してください');
        const text=input.body===undefined?draftReport(row):input.body;
        if(typeof text!=='string'||!text.trim()||text.length>100000) throw new InputError('文章を1～10万文字で入力してください');
        return json(res,200,await repo.saveDraft(id,row.version,text));
      }
    }
    return json(res,404,{error:'見つかりません'});
  } catch(error) {
    if(res.headersSent) return res.end();
    if(error instanceof InputError) return json(res,400,{error:error.message});
    if(error instanceof repo.Conflict) return json(res,409,{error:error.message});
    if(['23503','23514','22003','22007','22008'].includes(error.code)) return json(res,400,{error:'関連項番または入力値を確認してください'});
    console.error('Request failed',{name:error.name,code:error.code});
    return json(res,500,{error:'処理に失敗しました。接続状態を確認してください'});
  }
});
repo.initializeDemoData().then(count=>{
  if (count) console.log(`Added ${count} fictional dashboard incidents`);
  server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Incident manager listening'));
}).catch(error=>{console.error('Could not initialize dashboard sample data',error);process.exit(1);});

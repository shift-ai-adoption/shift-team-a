const $=id=>document.getElementById(id);
const specs=[
 ['record_type','区分','select',[['incident','インシデント'],['faq','FAQ']]],['node','ノード'],
 ['output_at','出力日時','datetime-local'],['occurred_at','発生日時','datetime-local'],
 ['message','メッセージ *','textarea'],['file_name','ファイル名'],['pattern','パターン'],
 ['log_line_count','ログ該当行数','number'],['grep_result','Grep結果','textarea'],
 ['occurrence_type','発生種別'],['business_type','業務種別'],['cause','原因（インシデントのみ）','textarea'],['response_action','回答兼対処','textarea'],
 ['assignee','担当者'],['status','ステータス','select',['未着手','対応中','保留','完了']],
 ['completed_on','完了日付','date'],['operation_minutes','操作時間（分）','number'],
 ['received_at','受付日時','datetime-local'],['first_response_at','初回回答日時','datetime-local'],
 ['novelty','新規／既出（人が判定）','select',['未判定','新規','既出・再発']],['defect','瑕疵の有無','select',['未判定','有','無']],
 ['related_id','関連するインシデントの項番','number'],['source_message_id','元メールID'],['source_text','元メール本文（保管用）','textarea']
];
let current=null,rows=[],dirty=false,draftDirty=false,requestKey=crypto.randomUUID(),draftVersion=null,loading=false;
function element(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;}
for(const [key,label,type='text',options] of specs){
 const wrapper=element('div',null,type==='textarea'?'wide':'');const lab=element('label',label);lab.htmlFor=key;wrapper.append(lab);
 const input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');input.id=key;input.name=key;
 if(type==='select')for(const option of options){const [value,text]=Array.isArray(option)?option:[option,option];const item=element('option',text);item.value=value;input.append(item);}
 else if(type==='textarea')input.rows=key==='source_text'?3:4;
 else {input.type=type;if(type==='number'){input.min=key==='related_id'?'1':'0';input.step='1';}if(type==='datetime-local') input.step='1';}
 if(key==='message')input.required=true;wrapper.append(input);$('fields').append(wrapper);
}
function notify(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
async function api(path,method='GET',value){const response=await fetch('/api'+path,{method,headers:value?{'Content-Type':'application/json'}:{},body:value?JSON.stringify(value):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'処理に失敗しました');return data;}
function safe(fn){return async event=>{event?.preventDefault();try{await fn(event);}catch(error){notify(error.message,true);}};}
function params(){return new URLSearchParams({q:$('q').value,status:$('filter-status').value,record_type:$('filter-type').value});}
function localTime(date){return date?new Date(new Date(date).getTime()+9*3600000).toISOString().slice(0,19):'';}
function renderForm(row){for(const [key,,type] of specs)$(key).value=type==='datetime-local'?localTime(row[key]):row[key]??'';toggleFaq();}
function toggleFaq(){$('cause').disabled=$('record_type').value==='faq';}
function values(){return Object.fromEntries(specs.map(([key,,type])=>[key,type==='datetime-local'&&$(key).value?new Date($(key).value+'+09:00').toISOString():$(key).value]));}
function canLeave(){return !(dirty||draftDirty)||confirm('未保存の入力内容があります。破棄して移動しますか？');}
function reset(){current=null;requestKey=crypto.randomUUID();renderForm({record_type:'incident',status:'未着手',novelty:'未判定',defect:'未判定',pattern:'未分類'});$('editor-title').textContent='新規登録';$('version').textContent='';$('save').textContent='登録する';$('delete').hidden=true;$('report').disabled=true;$('save-draft').disabled=true;$('draft').value='';$('mail').value='';$('history').replaceChildren(element('li','記録を選択すると表示します。'));dirty=false;draftDirty=false;draftVersion=null;}
async function openRow(id){if(!canLeave())return;const row=await api('/incidents/'+id);current=row;renderForm(row);$('editor-title').textContent=`#${row.id} の編集`;$('version').textContent=`版 ${row.version}`;$('save').textContent='更新する';$('delete').hidden=false;$('report').disabled=false;$('save-draft').disabled=true;$('draft').value='';$('mail').value=row.source_text;dirty=false;draftDirty=false;draftVersion=null;await loadHistory();const draft=await api(`/incidents/${id}/report`);if(draft){$('draft').value=draft.body;draftVersion=draft.incident_version;$('save-draft').disabled=false;if(draftVersion!==row.version)notify('保存済みの文章案は以前の版を基にしています。最新の内容から作成し直してください。');}}
async function loadHistory(){if(!current)return;const items=await api(`/incidents/${current.id}/history`);$('history').replaceChildren(...items.map(item=>element('li',`${new Date(item.created_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} / ${{create:'登録',update:'更新',delete:'削除'}[item.action]||item.action}`)));}
async function load(){rows=await api('/incidents?'+params());$('export').href='/api/export.xlsx?'+params();$('rows').replaceChildren();
 for(const row of rows){const tr=element('tr');tr.append(element('td','#'+row.id),element('td',row.occurred_at?new Date(row.occurred_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未入力'));const info=element('td',row.node||'対象未入力');info.append(element('span',row.message,'sub'));tr.append(info,element('td',row.assignee||'未割当'));const status=element('td');status.append(element('span',row.status,'status'));tr.append(status,element('td',row.novelty));const cell=element('td');const button=element('button','開く','secondary');button.type='button';button.addEventListener('click',safe(()=>openRow(row.id)));cell.append(button);tr.append(cell);$('rows').append(tr);}
 if(!rows.length){const td=element('td','該当する記録はありません。「新規作成」から登録できます。');td.colSpan=7;const tr=element('tr');tr.append(td);$('rows').append(tr);}renderMetrics();}
function renderMetrics(){const times=rows.map(r=>r.first_response_minutes).filter(v=>v!==null);const items=[['記録件数',rows.length],['未完了',rows.filter(r=>r.status!=='完了').length],['完了',rows.filter(r=>r.status==='完了').length],['平均一次回答時間（分）',times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):'—']];$('metrics').replaceChildren(...items.map(([label,value])=>{const d=element('div',null,'metric');d.append(element('span',label),element('strong',String(value)));return d;}));const counts=new Map();for(const row of rows){const key=$('group').value;const value=key==='month'?(row.occurred_at?localTime(row.occurred_at).slice(0,7):'未入力'):row[key]||'未入力';counts.set(value,(counts.get(value)||0)+1);}$('chart').replaceChildren(...[...counts].sort((a,b)=>b[1]-a[1]).map(([label,count])=>element('div',`${label}　${count}件`,'chart-item')));}
$('search').addEventListener('submit',safe(load));$('group').addEventListener('change',renderMetrics);
$('new').addEventListener('click',()=>{if(canLeave()){reset();$('editor-title').scrollIntoView({behavior:'smooth'});}});
$('editor').addEventListener('input',()=>{dirty=true;toggleFaq();});$('draft').addEventListener('input',()=>{draftDirty=true;});
$('editor').addEventListener('submit',safe(async()=>{if(loading)return;loading=true;$('save').disabled=true;try{const data=values();const saved=await api(current?'/incidents/'+current.id:'/incidents',current?'PUT':'POST',{...data,version:current?.version,request_key:requestKey});current=saved;dirty=false;$('editor-title').textContent=`#${saved.id} の編集`;$('version').textContent=`版 ${saved.version}`;$('save').textContent='更新する';$('delete').hidden=false;$('report').disabled=false;renderForm(saved);await load();await loadHistory();notify(`項番 ${saved.id} を保存しました。`);}finally{loading=false;$('save').disabled=false;}}));
$('delete').addEventListener('click',safe(async()=>{if(!current||!confirm(`項番 ${current.id} を一覧から削除しますか？ 履歴とデータは保持します。`))return;await api('/incidents/'+current.id,'DELETE',{version:current.version});reset();await load();notify('削除しました。');}));
$('extract').addEventListener('click',safe(async()=>{const result=await api('/extract','POST',{text:$('mail').value});const existing=values();renderForm({...existing,...result.values});dirty=true;notify(['抽出しました。内容を確認し、登録してください。',...result.warnings].join('\n'));}));
$('sample').addEventListener('click',()=>{$('mail').value='ノード：demo-server-01\n出力日時：2026-09-19 09:01:00\n発生日時：2026-09-19 09:00:00\n受付日時：2026-09-19 09:02:00\nメッセージ：業務バッチの接続タイムアウト（架空データ）\nファイル名：batch.log\nパターン：エラー\nログ該当行数：2\n業務種別：夜間バッチ\n発生種別：監視通知\nGrep結果：101 ERROR connection timeout\n102 ERROR retry exhausted';});
$('copy').addEventListener('click',safe(async()=>{await navigator.clipboard.writeText(specs.map(([key,label])=>`${label}：${key==='record_type'?($('record_type').value==='faq'?'FAQ':'インシデント'):$(key).value}`).join('\n'));notify('入力内容をコピーしました。');}));
$('report').addEventListener('click',safe(async()=>{if(dirty)throw Error('先に入力内容を保存してください');if(draftDirty&&!confirm('編集した文章を破棄して作り直しますか？'))return;const result=await api(`/incidents/${current.id}/report`,'POST',{version:current.version});$('draft').value=result.body;draftVersion=current.version;draftDirty=false;$('save-draft').disabled=false;notify('テンプレートから下書きを作成・保存しました。メールは送信していません。');}));
$('save-draft').addEventListener('click',safe(async()=>{if(dirty||draftVersion!==current?.version)throw Error('記録が変更されています。保存後、文章案を作成し直してください');await api(`/incidents/${current.id}/report`,'POST',{version:draftVersion,body:$('draft').value});draftDirty=false;notify('編集した下書きを保存しました。');}));
$('copy-draft').addEventListener('click',safe(async()=>{if(!$('draft').value)throw Error('文章案を作成してください');await navigator.clipboard.writeText($('draft').value);notify('文章をコピーしました。');}));
$('settings').addEventListener('submit',safe(async()=>{await api('/settings','PUT',{external_send_allowed:$('external').checked,llm_log_allowed:$('logs').checked});notify('設定を保存しました。LLMは未接続のため、外部送信は行いません。');}));
window.addEventListener('beforeunload',e=>{if(dirty||draftDirty){e.preventDefault();e.returnValue='';}});
reset();safe(async()=>{const settings=await api('/settings');$('external').checked=settings.external_send_allowed;$('logs').checked=settings.llm_log_allowed;await load();})();

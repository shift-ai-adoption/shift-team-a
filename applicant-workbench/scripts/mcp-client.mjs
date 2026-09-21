export async function connectMcp(){
 let session,id=0;
 async function call(method,params,notification=false){
  const response=await fetch('http://localhost:4401/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'mcp-session-id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:++id}),method,params})});
  session=response.headers.get('mcp-session-id')||session;
  const text=await response.text();
  if(!response.ok)throw new Error(`MCP HTTP ${response.status}: ${text}`);
  if(!text)return;
  const data=JSON.parse(text.startsWith('event:')?text.split('\n').find(line=>line.startsWith('data:')).slice(5):text);
  if(data.error)throw new Error(JSON.stringify(data.error));
  return data.result;
 }
 await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'applicant-workbench-check',version:'1.0.0'}});
 await call('notifications/initialized',{},true);
 return call;
}

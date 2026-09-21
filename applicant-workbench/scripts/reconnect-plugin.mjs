import { chromium } from '@playwright/test';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://localhost:9001'));
 if(!page)throw new Error('Dedicated Penpot browser not found.');
 const retry=page.getByRole('button',{name:/^(retry|再試行)$/i});
 if(await retry.count())await retry.first().click();
 let connected=false;
 for(const frame of page.frames()){
  const button=frame.getByRole('button',{name:/^Connect to MCP server$/i});
  if(await button.count()){await button.click();connected=true;break;}
  if(await frame.getByText('Connected to MCP server',{exact:true}).count()){connected=true;break;}
 }
 if(!connected)throw new Error('MCP plugin UI is not open. Open the Penpot MCP plugin from Plugins, then rerun. No ambiguous menu items were clicked.');
 console.log('MCP plugin connection requested or already active.');
} finally {await browser.close();}

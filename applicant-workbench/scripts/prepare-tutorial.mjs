import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const context=await chromium.launchPersistentContext('.browser-profile',{headless:true,viewport:{width:1600,height:1000}});
const page=context.pages()[0];page.setDefaultTimeout(15000);
const pause=ms=>page.waitForTimeout(ms);
async function drag(tool,x,y,w,h){
 await page.getByRole('button',{name:tool,exact:true}).click();await pause(200);
 await page.mouse.move(x,y);await page.mouse.down();await pause(100);await page.mouse.move(x+w,y+h,{steps:12});await page.mouse.up();await pause(250);
}
async function color(hex){const input=page.locator('input[aria-label="Color"]').last();await input.fill(hex);await input.press('Enter');await pause(150);}
async function rect(x,y,w,h,hex){await drag('Rectangle (R)',x,y,w,h);await color(hex);await page.keyboard.press('Escape');}
async function text(x,y,w,h,value,size=18,hex='293E56'){
 await drag('Text (T)',x,y,w,h);await page.keyboard.insertText(value);await page.keyboard.press('Escape');await pause(200);
 const input=page.getByLabel('Font Size',{exact:true});await input.fill(String(size));await input.press('Enter');await color(hex);await page.keyboard.press('Escape');
}
try{
 await page.goto((await readFile('data/penpot-tutorial-url.txt','utf8')).trim());await page.getByRole('button',{name:'Move (V)',exact:true}).waitFor();
 const trial=page.locator('span[id^="layer-name-"]').filter({hasText:/^申請者情報$/});
 if(await trial.count()===1){await trial.click();await page.keyboard.press('Delete');await pause(500);}
 await drag('Board (B)',415,155,790,650);await color('F5F7FA');await page.keyboard.press('Escape');
 await rect(445,185,730,590,'FFFFFF');
 await text(480,212,650,24,'行政手続きポータル  /  申請者管理',16,'57718E');
 await text(480,260,650,46,'申請者登録',32,'163C66');
 await text(480,315,650,32,'申請に使用する、ご本人の情報を登録してください。',18,'718197');
 await text(480,370,150,30,'申請者区分',18);
 await rect(480,411,310,48,'EAF1FA');await text(502,422,260,30,'● 個人として申請',18,'285E99');
 await rect(810,411,320,48,'F5F7FA');await text(832,422,280,30,'○ 法人として申請',18,'718197');
 await text(480,484,600,30,'氏名（必須）',18);
 await rect(480,523,650,52,'D8E1EC');await rect(481,524,648,50,'FFFFFF');await text(500,535,600,30,'例：山田 太郎',18,'8794A4');
 await text(480,594,620,28,'登録後も、申請者情報の確認・変更ができます。',16,'718197');
 await rect(480,673,170,52,'EEF2F7');await text(527,685,130,28,'戻る',18,'57718E');
 await rect(870,673,260,52,'285E99');await text(905,685,220,28,'確認画面へ進む',18,'FFFFFF');
 await page.keyboard.press('Escape');await pause(4000);
 await page.screenshot({path:'artifacts/tutorial-prepared.png'});
 const shapes=await page.locator('g.fills').evaluateAll(es=>es.map(e=>({id:e.id,html:e.innerHTML})).filter(e=>e.html.includes('40, 94, 153')||e.html.includes('申請者登録')));
 await writeFile('data/tutorial-shapes.json',JSON.stringify(shapes,null,2));
 console.log('Prepared native Penpot tutorial page.',shapes.map(x=>x.id));
}finally{await context.close()}

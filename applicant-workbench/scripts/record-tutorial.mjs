import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const out='video';await mkdir(out+'/raw',{recursive:true});
const url=(await readFile('data/penpot-tutorial-url.txt','utf8')).trim();
const shapeData=JSON.parse(await readFile('data/tutorial-shapes.json','utf8'));
const headingId=shapeData.find(s=>s.html.includes('申請者登録')).id.replace('fills-','');
const buttonId=shapeData.find(s=>s.html.startsWith('<rect')).id.replace('fills-','');
const original=await chromium.launchPersistentContext('.browser-profile',{headless:true});
const state=await original.storageState();await original.close();
const browser=await chromium.launch();
const context=await browser.newContext({storageState:state,viewport:{width:1600,height:1000},recordVideo:{dir:out+'/raw',size:{width:1600,height:1000}}});
const page=await context.newPage();page.setDefaultTimeout(15000);
const video=page.video();const started=Date.now();const timeline=[];let introTime=0;
const pause=ms=>page.waitForTimeout(ms);
async function overlay(){
 await page.evaluate(()=>{
  document.querySelector('#lesson-overlay')?.remove();
  const host=document.createElement('div');host.id='lesson-overlay';host.style.cssText='position:fixed;inset:0;z-index:2147483640;pointer-events:none;font-family:Meiryo,"Yu Gothic",sans-serif;';
  host.innerHTML=`<style>
  #lesson-chapter{position:absolute;left:370px;top:96px;padding:9px 19px;background:#163c66;color:white;border-radius:22px;font-size:18px;letter-spacing:.04em;box-shadow:0 3px 12px #0002}
  #lesson-caption{position:absolute;left:350px;right:18px;bottom:16px;padding:20px 30px;background:#102d4ff2;color:white;border-radius:12px;box-shadow:0 6px 28px #0003;font-size:25px;line-height:1.6;min-height:118px;text-align:center;white-space:pre-line}
  #lesson-cursor{position:absolute;width:30px;height:30px;border-radius:50%;border:3px solid #ffce54;background:#ffce5420;transform:translate(-50%,-50%);left:-100px;top:-100px;box-shadow:0 0 0 3px #fff8}
  #lesson-highlight{position:absolute;border:3px solid #e5ad27;border-radius:5px;box-shadow:0 0 0 5px #ffdd5730;display:none}
  #lesson-card{position:absolute;inset:0;background:linear-gradient(130deg,#f1f6fb,#fff);color:#163c66;display:none;padding:160px 165px;line-height:1.65}
  #lesson-card .kicker{font-size:19px;letter-spacing:.18em;color:#67839f;margin-bottom:26px}
  #lesson-card h1{font-size:62px;line-height:1.5;margin:0 0 26px;font-weight:700;white-space:pre-line}
  #lesson-card p{font-size:27px;color:#536f89;white-space:pre-line;margin:0}
  #lesson-card .tag{font-size:18px;padding:10px 22px;background:#e4eef7;border-radius:22px;display:inline-block;margin-top:32px}
  </style><div id="lesson-chapter"></div><div id="lesson-caption"></div><div id="lesson-highlight"></div><div id="lesson-cursor"></div><div id="lesson-card"></div>`;
  document.body.append(host);
  if(!window.lessonMouseAdded){window.lessonMouseAdded=true;document.addEventListener('mousemove',e=>{const c=document.querySelector('#lesson-cursor');if(c){c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'}});}
 });
}
async function caption(chapter,text,ms=0){
 timeline.push({time:(Date.now()-started)/1000,chapter,text});
 await page.evaluate(({chapter,text})=>{document.querySelector('#lesson-chapter').textContent=chapter;document.querySelector('#lesson-caption').textContent=text;document.querySelector('#lesson-card').style.display='none';document.querySelector('#lesson-highlight').style.display='none'}, {chapter,text});
 if(ms)await pause(ms);
}
async function card(kicker,title,text,tag,ms){
 timeline.push({time:(Date.now()-started)/1000,chapter:kicker,text:title+'\n'+text});
 await page.evaluate(({kicker,title,text,tag})=>{const el=document.querySelector('#lesson-card');el.replaceChildren();for(const [t,c,s] of [['div','kicker',kicker],['h1','',title],['p','',text],['div','tag',tag]]){const x=document.createElement(t);x.className=c;x.textContent=s;el.append(x)}el.style.display='block'}, {kicker,title,text,tag});await pause(ms);
}
async function highlight(locator){const r=await locator.boundingBox();if(!r)return;await page.evaluate(r=>{const el=document.querySelector('#lesson-highlight');Object.assign(el.style,{display:'block',left:(r.x-5)+'px',top:(r.y-5)+'px',width:(r.width+10)+'px',height:(r.height+10)+'px'})},r);}
async function click(locator){await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:24});await pause(350);await locator.click({delay:120});await pause(350);}
const layer=id=>page.locator('#layer-name-'+id);
async function expand(){
 if(!await layer(headingId).count())await click(page.locator('span[id^="layer-name-"]').filter({hasText:/^Board$/}).locator('..').locator('[class*="toggle-content"]'));
}
try{
 await page.goto(url);await page.getByRole('button',{name:'Move (V)',exact:true}).waitFor();await pause(1200);
 // Reset only the two tutorial objects to the demonstrated initial state.
 await expand();await click(layer(headingId));await page.keyboard.press('Enter');await pause(200);await page.keyboard.press('Control+a');await page.keyboard.insertText('申請者登録');await page.keyboard.press('Escape');await pause(200);
 await click(layer(buttonId));await page.getByLabel('Color',{exact:true}).last().fill('285E99');await page.getByLabel('Color',{exact:true}).last().press('Enter');await page.mouse.click(1240,855,{delay:100});await pause(3500);
 // Start with the board collapsed so the recording shows how to open its layers.
 if(await layer(headingId).count())await click(page.locator('span[id^="layer-name-"]').filter({hasText:/^Board$/}).locator('..').locator('[class*="toggle-content"]'));
 await page.mouse.move(1230,830);await overlay();introTime=(Date.now()-started)/1000;
 await card('はじめての PENPOT','画面修正を、ひとつずつ。','申請者登録の練習用デザインで\n見出しとボタンの色を変更します。','実画面の操作録画  /  日本語キャプション付き',6500);
 await caption('01 / 06 画面の見方','中央はデザイン、左は部品の一覧「レイヤー」。\n右のパネルで、色や文字の見た目を調整します。',7500);
 await page.screenshot({path:out+'/01-before.png'});
 await caption('01 / 06 画面の見方','今回は「見出し」と「進むボタン」を修正します。\n練習用ページなので、まずは操作に慣れましょう。',5500);
 await caption('02 / 06 見出しを変更','左の「Board」の矢印を押すと、\n画面を構成する文字や図形が表示されます。');
 await expand();await pause(5000);
 await caption('02 / 06 見出しを変更','「申請者登録」の文字レイヤーを選択します。\n選択した部品には、枠が表示されます。');
 await click(layer(headingId));await pause(4500);
 await caption('02 / 06 見出しを変更','Enterキーで文字の編集を開始。\nCtrl + A で文字全体を選び、新しい見出しを入力します。');
 await page.keyboard.press('Enter');await pause(1600);await page.keyboard.press('Control+a');await pause(900);
 for(const chunk of ['申請者','情報の','登録']){await page.keyboard.insertText(chunk);await pause(850)}
 await pause(1300);await page.keyboard.press('Escape');await pause(1500);
 if(!await layer(headingId).textContent().then(t=>t==='申請者情報の登録'))throw new Error('Heading edit failed');
 await caption('02 / 06 見出しを変更','Escキーで文字編集を終了します。\n見出しが「申請者情報の登録」に変わりました。',5500);
 await page.screenshot({path:out+'/02-heading.png'});
 await caption('03 / 06 ボタンの色を変更','次に、ボタンの背景になっている図形を選びます。\n文字と背景は、別々のレイヤーです。');
 await click(layer(buttonId));await pause(5000);
 const color=page.getByLabel('Color',{exact:true}).last();
 await caption('03 / 06 ボタンの色を変更','右側の「FILL」は、塗りつぶしの設定です。\n色コードを入力すると、狙った色に変更できます。');
 await highlight(color);await pause(6000);
 await caption('03 / 06 ボタンの色を変更','青の 285E99 を、緑の 176B56 に変更。\n入力したら Enterキーで確定します。');
 await click(color);await color.fill('176B56');await pause(2200);await color.press('Enter');await pause(3000);
 if((await color.inputValue()).toUpperCase()!=='176B56')throw new Error('Color edit failed');
 await caption('03 / 06 ボタンの色を変更','ボタンが緑に変わりました。\n文字が読みやすいか、画面全体の中でも確認します。',5500);
 await page.screenshot({path:out+'/03-color.png'});
 await caption('04 / 06 元に戻す・やり直す','間違えても大丈夫。\nCtrl + Z で、ひとつ前の状態に戻せます。');
 await page.mouse.click(1240,850,{delay:100});await page.keyboard.press('Control+z');await pause(5000);
 await caption('04 / 06 元に戻す・やり直す','青に戻ったことを確認します。\nCtrl + Shift + Z で、取り消した操作をやり直します。');
 await page.keyboard.press('Control+Shift+z');await pause(5500);
 await caption('05 / 06 保存と確認','何もない場所をクリックして、選択の枠を外します。\n見出しとボタンを、変更前と見比べましょう。');
 await page.mouse.click(1240,850,{delay:100});await page.mouse.move(1250,825,{steps:10});await pause(6000);
 await page.screenshot({path:out+'/04-after.png'});
 await caption('05 / 06 保存と確認','Penpotは変更を自動保存します。\n保存を待ち、ページを再読み込みして確認します。',5000);
 await page.reload();await page.getByRole('button',{name:'Move (V)',exact:true}).waitFor();await pause(1200);await overlay();
 await caption('05 / 06 保存と確認','再読み込み後も、変更した見出しと色が残っています。\nこれで、デザイン側の修正は完了です。',6500);
 await expand();await click(layer(headingId));
 if((await layer(headingId).textContent())!=='申請者情報の登録')throw new Error('Saved heading mismatch');
 await click(layer(buttonId));if((await page.getByLabel('Color',{exact:true}).last().inputValue()).toUpperCase()!=='176B56')throw new Error('Saved color mismatch');
 await page.mouse.click(1240,850,{delay:100});
 await card('06 / 06 実際のアプリへ反映','デザインの次は、コードの修正。','Penpotの変更だけでは、アプリは変わりません。\n変更内容をCodexへ伝え、実装と動作確認を進めます。','ここからは次の工程の説明です',8000);
 await card('CODEXへの依頼例','変更点を、具体的に伝えます。','「申請者登録画面の見出しを『申請者情報の登録』に。\n進むボタンを #176B56 に変更し、\nPCとスマートフォンで表示・操作を確認してください。」','画面名 ＋ 変更内容 ＋ 確認してほしいこと',10000);
 await card('今回のおさらい','選ぶ → 変える → 確認する','文字は Enter で編集。色は FILL で変更。\nCtrl + Z で戻し、最後に保存と見た目を確認。','練習用デザイン  /  音声なし・字幕付き',7000);
 const endTime=(Date.now()-started)/1000;
 await writeFile(out+'/timeline.json',JSON.stringify({introTime,endTime,events:timeline.filter(e=>e.time>=introTime)},null,2));
 await context.close();const path=await video.path();await writeFile(out+'/raw-video-path.txt',path);
 console.log(JSON.stringify({raw:path,introTime,endTime,duration:endTime-introTime}));
}finally{await browser.close()}

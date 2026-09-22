import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Export visible geometry and text as editable SVG, never a raster image wrapper.
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const base=process.env.APP_URL||'http://127.0.0.1:3201';
await mkdir('design/screens',{recursive:true});
async function save(name){
 const svg=await page.evaluate(()=>{
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const width=document.documentElement.clientWidth,height=document.documentElement.scrollHeight;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f5f7fa"/>`;
  const xy=rect=>({x:rect.x+scrollX,y:rect.y+scrollY,w:rect.width,h:rect.height});
  const color=c=>c==='rgba(0, 0, 0, 0)'||c==='transparent'?'none':c;
  function walk(el){
   if(el.nodeType===Node.TEXT_NODE){
    if(!el.textContent.trim())return;
    const css=getComputedStyle(el.parentElement);let line='',lastY=null,startX=0,bottom=0;
    function flush(){if(line.trim())out+=`<text x="${startX}" y="${bottom-parseFloat(css.fontSize)*.18}" font-family="sans-serif" font-size="${css.fontSize}" font-weight="${css.fontWeight}" fill="${css.color}">${escape(line)}</text>`;line='';}
    for(let i=0;i<el.textContent.length;i++){
     const range=document.createRange();range.setStart(el,i);range.setEnd(el,i+1);const r=xy(range.getBoundingClientRect());
     if(r.w===0)continue;
     if(lastY!==null&&Math.abs(lastY-r.y)>2)flush();
     if(!line){startX=r.x;bottom=r.y+r.h}line+=el.textContent[i];lastY=r.y;
    }flush();return;
   }
   if(el.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE','OPTION'].includes(el.tagName))return;
   const css=getComputedStyle(el),r=xy(el.getBoundingClientRect());
   if(css.display==='none'||css.visibility==='hidden'||!r.w||!r.h||r.y<0)return;
   const bg=color(css.backgroundColor),border=parseFloat(css.borderTopWidth);
   if(bg!=='none'||border>0)out+=`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${Math.min(parseFloat(css.borderRadius)||0,r.h/2)}" fill="${bg}" stroke="${border?css.borderTopColor:'none'}" stroke-width="${border}"/>`;
   if(el.tagName.toLowerCase()==='svg'){
    out+=`<svg x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" viewBox="${el.getAttribute('viewBox')}" fill="none" stroke="${css.color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${el.innerHTML}</svg>`;return;
   }
   if(['INPUT','SELECT'].includes(el.tagName)){
    if(['radio','checkbox'].includes(el.type)){out+=`<circle cx="${r.x+r.w/2}" cy="${r.y+r.h/2}" r="7" fill="${el.checked?'#285e99':'#ffffff'}" stroke="#b8c6d5"/>`;return;}
    const text=el.tagName==='SELECT'?el.selectedOptions[0]?.text:el.value||el.placeholder;
    if(text)out+=`<text x="${r.x+parseFloat(css.paddingLeft)}" y="${r.y+r.h/2+parseFloat(css.fontSize)*.35}" font-family="sans-serif" font-size="${css.fontSize}" fill="${el.value?css.color:'#8592a2'}">${escape(text)}</text>`;
    return;
   }
   for(const child of el.childNodes)walk(child);
  }
  walk(document.body);return out+'</svg>';
 });
 await writeFile(`design/screens/${name}.svg`,svg);
}
try {
 await page.goto(base);await page.getByRole('button',{name:'山田 太郎',exact:true}).waitFor();await save('01-list');
 await page.getByRole('button',{name:'申請者を新規登録'}).click();await save('02-individual-create');
 await page.getByRole('radio',{name:'法人',exact:false}).check();await save('03-corporation-create');
 await page.goto(base);await page.getByRole('button',{name:'山田 太郎',exact:true}).click();await save('04-detail');
 await page.getByRole('button',{name:'申請者情報を編集'}).click();await save('05-edit');
 await page.getByRole('button',{name:'確認画面へ進む'}).click();await save('06-confirm');
 await page.goto(base);await page.getByRole('button',{name:'山田 太郎',exact:true}).click();
 await page.getByRole('button',{name:'削除する'}).click();await save('07-delete');
 await page.goto(base);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'山田 太郎',exact:true}).waitFor();await save('08-mobile');
 console.log('Exported 8 editable SVG reference screens.');
}finally{await browser.close()}

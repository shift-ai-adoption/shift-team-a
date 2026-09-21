import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch();
await mkdir('artifacts',{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3200');
 await page.getByRole('button',{name:'山田 太郎',exact:true}).waitFor();
 await page.screenshot({path:'artifacts/applicants-list.png',fullPage:true});
 await page.getByRole('button',{name:'申請者を新規登録'}).click();
 await page.screenshot({path:'artifacts/applicant-individual.png',fullPage:true});
 await page.getByRole('radio',{name:'法人',exact:false}).check();
 await page.screenshot({path:'artifacts/applicant-corporation.png',fullPage:true});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3200');
 await page.getByRole('button',{name:'山田 太郎',exact:true}).click();
 await page.screenshot({path:'artifacts/applicant-detail.png',fullPage:true});
 await page.getByRole('button',{name:'削除する'}).click();
 await page.screenshot({path:'artifacts/applicant-delete.png',fullPage:true});
 await page.getByRole('button',{name:'キャンセル',exact:true}).click();
 await page.getByRole('button',{name:'一覧に戻る'}).click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/applicants-mobile.png',fullPage:true});
 console.log('Captured 6 screens in artifacts/.');
} finally {await browser.close();}

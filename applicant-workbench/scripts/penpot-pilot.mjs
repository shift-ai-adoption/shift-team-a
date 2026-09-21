import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://localhost:9001'));
 if(!page)throw new Error('Open Penpot in the dedicated browser first: node scripts/start-browser.mjs');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/penpot-visual-check.png',fullPage:true});
 console.log('Saved artifacts/penpot-visual-check.png');
} finally {await browser.close();}

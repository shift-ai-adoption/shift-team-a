import { chromium } from '@playwright/test';
import { readFile,readdir,writeFile } from 'node:fs/promises';
import { connectMcp } from './mcp-client.mjs';
const context=await chromium.launchPersistentContext('.browser-profile',{headless:true,viewport:{width:1440,height:1000}});
try {
 const page=context.pages()[0];page.setDefaultTimeout(15000);
 await page.goto((await readFile('data/penpot-design-url.txt','utf8')).trim());
 await page.getByRole('button',{name:'Plugins (Ctrl+Alt+P)',exact:true}).click();
 await page.getByPlaceholder('Write a plugin URL').fill('http://localhost:4400/manifest.json');
 await page.getByRole('button',{name:'Install',exact:true}).click();
 await page.waitForTimeout(700);
 await page.getByRole('button',{name:'Allow',exact:true}).click();
 await page.waitForTimeout(500);
 console.log(await page.locator('body').innerText());
 console.log(await page.locator('button').evaluateAll(es=>es.map(e=>({text:e.textContent,title:e.title,label:e.getAttribute('aria-label')}))));
 console.log(page.frames().map(f=>f.url()));
 console.log(await page.locator('input').evaluateAll(es=>es.map(e=>({name:e.name,placeholder:e.placeholder,type:e.type,value:e.type==='button'?e.value:''}))));
} finally {await context.close()}

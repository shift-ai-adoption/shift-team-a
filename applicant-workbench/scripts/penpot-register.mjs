import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
await mkdir('data',{recursive:true});
let credentials;
try{credentials=JSON.parse(await readFile('data/penpot-local.json','utf8'))}catch{
 credentials={email:'designer@example.test',password:randomBytes(24).toString('base64url'),name:'Local Designer'};
 await writeFile('data/penpot-local.json',JSON.stringify(credentials,null,2));
}
const context=await chromium.launchPersistentContext('.browser-profile',{headless:true,viewport:{width:1440,height:1000}});
const page=context.pages()[0];
await page.goto('http://localhost:9001');await page.getByText('Create an account',{exact:true}).waitFor();
if(await page.getByText('Create an account',{exact:true}).count()){
 await page.getByText('Create an account',{exact:true}).click();
 await page.waitForTimeout(300);
 await page.locator('input[name="fullname"]').fill(credentials.name);
 await page.locator('input[name="email"]').fill(credentials.email);
 await page.locator('input[name="password"]').fill(credentials.password);
 await page.getByRole('button',{name:'Create an account',exact:true}).click();
 await page.waitForTimeout(2000);
 console.log('URL',page.url());
 console.log(await page.locator('body').innerText());
}
await context.close();

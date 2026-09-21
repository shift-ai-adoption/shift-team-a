import { chromium } from '@playwright/test';
import { writeFile,readFile } from 'node:fs/promises';
const context=await chromium.launchPersistentContext('.browser-profile',{headless:true,viewport:{width:1440,height:1000}});
try {
 const page=context.pages()[0];page.setDefaultTimeout(10000);
 await page.goto('http://localhost:9001');await page.getByText('Projects',{exact:true}).first().waitFor({timeout:60000});
 if(await page.getByText('Personal',{exact:true}).count()){
  await page.getByText('Personal',{exact:true}).click();await page.getByText('Select option',{exact:true}).click();await page.getByText('Development',{exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).first().click();
  await page.getByText('Other',{exact:true}).click();await page.getByPlaceholder('Other (specify)').fill('Local development sample');await page.getByRole('button',{name:'Next',exact:true}).first().click();
  await page.getByText('Design the UI/UX of an app',{exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();
 }
 if(await page.getByRole('button',{name:'Continue without team',exact:true}).count())await page.getByRole('button',{name:'Continue without team',exact:true}).click();
 await page.getByText('Create new file',{exact:true}).click();await page.waitForURL('**/workspace**');await page.waitForTimeout(2000);
 await writeFile('data/penpot-design-url.txt',page.url());
 console.log('CREATED',page.url(),await page.locator('body').innerText());console.log(await page.locator('button').evaluateAll(es=>es.map(e=>({text:e.textContent,title:e.title,label:e.getAttribute('aria-label')}))));
} finally {await context.close()}

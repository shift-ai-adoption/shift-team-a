import { chromium } from '@playwright/test';
// Dedicated profile only; never attaches to the user's everyday browser profile.
const context=await chromium.launchPersistentContext('.browser-profile',{headless:false,viewport:{width:1440,height:1000},args:['--remote-debugging-address=127.0.0.1','--remote-debugging-port=9222']});
const page=context.pages()[0]||await context.newPage();
await page.goto('http://localhost:9001');
console.log('Dedicated Penpot browser: CDP http://127.0.0.1:9222. Keep this process running.');
await new Promise(resolve=>context.on('close',resolve));

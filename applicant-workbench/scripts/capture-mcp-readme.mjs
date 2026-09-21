import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

await mkdir('docs/images', { recursive: true });
const url = (await readFile('data/penpot-tutorial-url.txt', 'utf8')).trim();
const context = await chromium.launchPersistentContext('.browser-profile', {
  headless: true,
  viewport: { width: 1440, height: 1000 },
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/images/mcp-edit-before.png' });
} finally {
  await context.close();
}

import { chromium } from 'playwright';
import path from 'path';

async function openSite() {
  const userDataDir = 'C:\\Users\\Split Lease\\AppData\\Local\\ms-playwright\\mcp-chrome-host';
  const browser = await chromium.launchPersistentContext(userDataDir, { 
    headless: true,
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  console.log('Navigating to https://www.split.lease...');
  await page.goto('https://www.split.lease', { waitUntil: 'networkidle' });
  
  const title = await page.title();
  console.log('Page title:', title);
  
  const screenshotPath = 'split-lease-open.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
}

openSite().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

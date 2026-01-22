import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkDeployment() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // Collect network errors
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'Unknown error'
    });
  });

  try {
    console.log('Navigating to https://rod-branch.splitlease.pages.dev/...');

    // Navigate with extended timeout
    const response = await page.goto('https://rod-branch.splitlease.pages.dev/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log(`Response status: ${response.status()}`);
    console.log(`Response status text: ${response.statusText()}`);

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = join(__dirname, 'deployment-screenshot.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Get page content info
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText.trim().length > 0;
    const isWhitePage = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const hasVisibleContent = body.innerText.trim().length > 0;
      const hasVisibleElements = body.children.length > 0;
      return !hasVisibleContent && !hasVisibleElements;
    });

    // Get page title
    const title = await page.title();

    // Report findings
    console.log('\n=== PAGE STATUS ===');
    console.log(`Title: ${title}`);
    console.log(`Has content: ${hasContent}`);
    console.log(`Is white/blank page: ${isWhitePage}`);
    console.log(`Body text length: ${bodyText.trim().length} characters`);
    console.log(`First 200 chars: ${bodyText.trim().substring(0, 200)}`);

    console.log('\n=== CONSOLE LOGS ===');
    if (consoleLogs.length === 0) {
      console.log('No console messages');
    } else {
      consoleLogs.forEach((log, i) => {
        console.log(`[${i + 1}] ${log.type.toUpperCase()}: ${log.text}`);
      });
    }

    console.log('\n=== PAGE ERRORS ===');
    if (pageErrors.length === 0) {
      console.log('No JavaScript errors detected');
    } else {
      pageErrors.forEach((err, i) => {
        console.log(`[${i + 1}] ${err.message}`);
        if (err.stack) console.log(err.stack);
      });
    }

    console.log('\n=== NETWORK ERRORS ===');
    if (networkErrors.length === 0) {
      console.log('No network errors detected');
    } else {
      networkErrors.forEach((err, i) => {
        console.log(`[${i + 1}] ${err.url}: ${err.failure}`);
      });
    }

  } catch (error) {
    console.error('Error during page check:', error.message);
    console.error(error.stack);
  } finally {
    await context.close();
    await browser.close();
  }
}

checkDeployment().catch(console.error);

import { chromium } from 'playwright';

async function testHomepage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const errors = [];

  // Capture console messages
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.toString());
  });

  try {
    // Navigate to homepage
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle', timeout: 10000 });

    // Wait a bit for React to mount
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL21/Split Lease/homepage-screenshot.png', fullPage: true });

    // Get page content
    const content = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log('=== HOMEPAGE TEST RESULTS ===\n');
    console.log('Console Messages:', JSON.stringify(consoleMessages, null, 2));
    console.log('\nPage Errors:', JSON.stringify(errors, null, 2));
    console.log('\nBody Text (first 500 chars):', bodyText.substring(0, 500));
    console.log('\nPage has #home-page div:', await page.evaluate(() => !!document.getElementById('home-page')));
    console.log('Content of #home-page:', await page.evaluate(() => document.getElementById('home-page')?.innerHTML?.substring(0, 200)));

  } catch (error) {
    console.error('Navigation error:', error);
  } finally {
    await browser.close();
  }
}

testHomepage().catch(console.error);

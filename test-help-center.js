/**
 * Playwright Test Script for Help Center Redirect Issues
 * Tests the latest deployment at https://14aec9d6.splitlease.pages.dev
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const DEPLOYMENT_URL = 'https://14aec9d6.splitlease.pages.dev';
const MAIN_DOMAIN_URL = 'https://split.lease';
const SCREENSHOTS_DIR = path.join(__dirname, '.playwright-mcp', 'help-center-tests');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Test results collection
const testResults = [];

/**
 * Helper function to wait and take screenshot
 */
async function captureTestResult(page, testName, description) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    console.log(`Warning: Network not idle for ${testName}`);
  });

  // Get current URL
  const currentURL = page.url();

  // Check for errors in console
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Take screenshot
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${testName.replace(/\s+/g, '-')}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Get page title
  const title = await page.title();

  // Check if page loaded successfully (not 404)
  const bodyText = await page.textContent('body').catch(() => '');
  const is404 = bodyText.includes('404') || bodyText.includes('Not Found') || title.includes('404');

  const result = {
    testName,
    description,
    currentURL,
    title,
    is404,
    errors: errors.slice(0, 5), // Limit to first 5 errors
    screenshotPath,
    success: !is404 && currentURL.includes('help-center')
  };

  testResults.push(result);

  console.log(`\n--- ${testName} ---`);
  console.log(`Description: ${description}`);
  console.log(`Final URL: ${currentURL}`);
  console.log(`Page Title: ${title}`);
  console.log(`Is 404: ${is404}`);
  console.log(`Screenshot: ${screenshotPath}`);

  return result;
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('Starting Help Center Redirect Tests...\n');
  console.log(`Testing deployment: ${DEPLOYMENT_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  try {
    // TEST 1: Direct navigation to /help-center
    console.log('\n========== TEST 1: Direct navigation to /help-center ==========');
    const page1 = await context.newPage();
    try {
      await page1.goto(`${DEPLOYMENT_URL}/help-center`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await captureTestResult(page1, 'test-1-direct-help-center', 'Direct navigation to /help-center');
    } catch (error) {
      console.log(`Error in Test 1: ${error.message}`);
      testResults.push({
        testName: 'test-1-direct-help-center',
        description: 'Direct navigation to /help-center',
        currentURL: 'Failed to load',
        title: 'Error',
        is404: false,
        errors: [error.message],
        screenshotPath: 'N/A',
        success: false
      });
    }
    await page1.close();

    // TEST 2: Direct navigation to /help-center.html
    console.log('\n========== TEST 2: Direct navigation to /help-center.html ==========');
    const page2 = await context.newPage();
    try {
      await page2.goto(`${DEPLOYMENT_URL}/help-center.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await captureTestResult(page2, 'test-2-direct-help-center-html', 'Direct navigation to /help-center.html');
    } catch (error) {
      console.log(`Error in Test 2: ${error.message}`);
      testResults.push({
        testName: 'test-2-direct-help-center-html',
        description: 'Direct navigation to /help-center.html',
        currentURL: 'Failed to load',
        title: 'Error',
        is404: false,
        errors: [error.message],
        screenshotPath: 'N/A',
        success: false
      });
    }
    await page2.close();

    // TEST 3: Click Support Centre from homepage
    console.log('\n========== TEST 3: Click Support Centre from homepage ==========');
    const page3 = await context.newPage();
    await page3.goto(DEPLOYMENT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for page to load
    await page3.waitForTimeout(2000);

    // Scroll down to find Support Centre card
    await page3.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page3.waitForTimeout(1000);

    // Try multiple selectors for Support Centre
    const supportCentreSelectors = [
      'a[href*="help-center"]',
      'a[href*="support"]',
      'text=Support Centre',
      'text=Support Center',
      '[data-testid*="support"]'
    ];

    let clicked = false;
    for (const selector of supportCentreSelectors) {
      try {
        const element = await page3.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`Found element with text: ${text}`);
          if (text.toLowerCase().includes('support') || text.toLowerCase().includes('help')) {
            await element.click();
            clicked = true;
            console.log(`Clicked on: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!clicked) {
      console.log('Could not find Support Centre link on homepage');
    }

    await page3.waitForTimeout(2000);
    await captureTestResult(page3, 'test-3-homepage-support-centre-click', 'Click Support Centre from homepage');
    await page3.close();

    // TEST 4: Click Support Centre from search page menu
    console.log('\n========== TEST 4: Click Support Centre from search page menu ==========');
    const page4 = await context.newPage();
    await page4.goto(`${DEPLOYMENT_URL}/search.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for page to load
    await page4.waitForTimeout(2000);

    // Try to find and click hamburger menu
    const menuSelectors = [
      '[data-testid="menu-button"]',
      'button[aria-label*="menu"]',
      'button[aria-label*="Menu"]',
      '.menu-button',
      '#menu-button',
      'button.hamburger',
      '[class*="hamburger"]',
      '[class*="menu-icon"]'
    ];

    let menuClicked = false;
    for (const selector of menuSelectors) {
      try {
        const menuButton = await page4.$(selector);
        if (menuButton) {
          await menuButton.click();
          menuClicked = true;
          console.log(`Clicked menu button: ${selector}`);
          await page4.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!menuClicked) {
      console.log('Could not find menu button, trying to find Support Centre link directly');
    }

    // Try to find and click Support Centre in menu
    let supportClicked = false;
    for (const selector of supportCentreSelectors) {
      try {
        const element = await page4.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text.toLowerCase().includes('support') || text.toLowerCase().includes('help')) {
            await element.click();
            supportClicked = true;
            console.log(`Clicked Support Centre in menu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!supportClicked) {
      console.log('Could not find Support Centre link in menu');
    }

    await page4.waitForTimeout(2000);
    await captureTestResult(page4, 'test-4-search-menu-support-centre-click', 'Click Support Centre from search page menu');
    await page4.close();

    // TEST 5: Test main domain
    console.log('\n========== TEST 5: Test main domain /help-center ==========');
    const page5 = await context.newPage();
    try {
      await page5.goto(`${MAIN_DOMAIN_URL}/help-center`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await captureTestResult(page5, 'test-5-main-domain-help-center', 'Main domain /help-center');
    } catch (error) {
      console.log(`Error loading main domain: ${error.message}`);
      testResults.push({
        testName: 'test-5-main-domain-help-center',
        description: 'Main domain /help-center',
        currentURL: 'Failed to load',
        title: 'Error',
        is404: true,
        errors: [error.message],
        screenshotPath: 'N/A',
        success: false
      });
    }
    await page5.close();

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await context.close();
    await browser.close();
  }

  // Generate report
  generateReport();
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
  console.log('\n\n========================================');
  console.log('COMPREHENSIVE TEST REPORT');
  console.log('========================================\n');

  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter(r => r.success).length}`);
  console.log(`Failed: ${testResults.filter(r => !r.success).length}`);
  console.log('\n');

  testResults.forEach((result, index) => {
    console.log(`\n--- Test ${index + 1}: ${result.testName} ---`);
    console.log(`Description: ${result.description}`);
    console.log(`Final URL: ${result.currentURL}`);
    console.log(`Page Title: ${result.title}`);
    console.log(`Status: ${result.success ? 'PASSED' : 'FAILED'}`);
    console.log(`Is 404: ${result.is404}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.join(', ')}`);
    }
    console.log(`Screenshot: ${result.screenshotPath}`);
  });

  // Save JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n\nDetailed JSON report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

// Run tests
runTests().catch(console.error);

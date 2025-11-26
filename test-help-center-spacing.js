const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testHelpCenterSpacing() {
  console.log('Starting help-center spacing verification...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to help-center/guests page...');
    await page.goto('https://64a8d795.splitlease.pages.dev/help-center/guests', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded. Waiting for content to render...');
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'help-center-spacing-test.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Get header element
    const header = await page.$('header, [role="banner"], nav');
    let headerBottom = 0;
    if (header) {
      const headerBox = await header.boundingBox();
      if (headerBox) {
        headerBottom = headerBox.y + headerBox.height;
        console.log(`Header bottom position: ${headerBottom}px`);
      }
    }

    // Get the "For Guests" title element
    const titleSelectors = [
      'h1:has-text("For Guests")',
      'h1:has-text("Guests")',
      'h1',
      '[class*="title"]',
      '[class*="heading"]'
    ];

    let titleElement = null;
    let titleText = '';
    let titleTop = 0;

    for (const selector of titleSelectors) {
      try {
        titleElement = await page.$(selector);
        if (titleElement) {
          titleText = await titleElement.textContent();
          const titleBox = await titleElement.boundingBox();
          if (titleBox) {
            titleTop = titleBox.y;
            console.log(`Title "${titleText.trim()}" found at top position: ${titleTop}px`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Calculate spacing
    const spacing = titleTop - headerBottom;
    console.log(`Spacing between header and title: ${spacing}px`);

    // Get viewport info
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    console.log(`Viewport height: ${viewportHeight}px`);

    // Check if title is visible in viewport
    const isTitleVisible = titleTop >= headerBottom && titleTop < viewportHeight;
    console.log(`Title visible in viewport: ${isTitleVisible}`);

    // Determine PASS/FAIL
    const result = {
      status: 'UNKNOWN',
      headerBottom: headerBottom,
      titleTop: titleTop,
      spacing: spacing,
      titleText: titleText.trim(),
      isTitleVisible: isTitleVisible,
      screenshotPath: screenshotPath
    };

    if (spacing >= 0 && isTitleVisible) {
      result.status = 'PASS';
      result.message = `Content is properly spaced below the header with ${spacing}px spacing. Title "${titleText.trim()}" is visible.`;
    } else if (spacing < 0) {
      result.status = 'FAIL';
      result.message = `Content overlaps with header by ${Math.abs(spacing)}px. Title is being cut off.`;
    } else if (!isTitleVisible) {
      result.status = 'FAIL';
      result.message = `Title is not visible in viewport. May be positioned off-screen.`;
    }

    console.log('\n========== TEST RESULT ==========');
    console.log(`Status: ${result.status}`);
    console.log(`Message: ${result.message}`);
    console.log('==================================\n');

    // Save result to JSON
    const resultPath = path.join(__dirname, 'help-center-test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`Test result saved to: ${resultPath}`);

    return result;

  } catch (error) {
    console.error('Error during test:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
    console.log('Browser closed.');
  }
}

testHelpCenterSpacing()
  .then(result => {
    process.exit(result.status === 'PASS' ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(2);
  });

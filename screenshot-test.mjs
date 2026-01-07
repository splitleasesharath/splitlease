import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  // Use desktop width (1024px) since the "Invite Friends" button is hidden on mobile (< 900px)
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 }
  });
  const page = await context.newPage();

  try {
    // === INDEX PAGE ===
    console.log('Navigating to index page...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Scroll to the footer
    console.log('Scrolling to footer on index page...');
    await page.evaluate(() => {
      const footer = document.querySelector('.main-footer');
      if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(1000);

    // Find and click the share button
    console.log('Looking for Invite Friends button (.share-btn) on index page...');
    const shareBtn = page.locator('.share-btn').first();

    if (await shareBtn.isVisible({ timeout: 3000 })) {
      console.log('Found .share-btn, clicking...');
      await shareBtn.click();
      await page.waitForTimeout(1500);

      // Take screenshot
      console.log('Taking screenshot of modal on index page...');
      await page.screenshot({ path: 'screenshots/index-referral-modal.png', fullPage: false });
      console.log('Screenshot saved: screenshots/index-referral-modal.png');

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('.share-btn not visible on index page');
      await page.screenshot({ path: 'screenshots/index-debug.png', fullPage: true });
    }

    // === HOST-PROPOSALS PAGE ===
    console.log('\nNavigating to host-proposals page...');
    await page.goto('http://localhost:8000/host-proposals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Scroll to footer
    console.log('Scrolling to footer on host-proposals page...');
    await page.evaluate(() => {
      const footer = document.querySelector('.main-footer');
      if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(1000);

    // Find and click the share button
    console.log('Looking for Invite Friends button (.share-btn) on host-proposals page...');
    const shareBtnHost = page.locator('.share-btn').first();

    if (await shareBtnHost.isVisible({ timeout: 3000 })) {
      console.log('Found .share-btn, clicking...');
      await shareBtnHost.click();
      await page.waitForTimeout(1500);

      // Take screenshot
      console.log('Taking screenshot of modal on host-proposals page...');
      await page.screenshot({ path: 'screenshots/host-proposals-referral-modal.png', fullPage: false });
      console.log('Screenshot saved: screenshots/host-proposals-referral-modal.png');
    } else {
      console.log('.share-btn not visible on host-proposals page');
      await page.screenshot({ path: 'screenshots/host-proposals-debug.png', fullPage: true });
    }

    console.log('\nScreenshots completed!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: 'screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

takeScreenshots();

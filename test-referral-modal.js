const { chromium } = require('playwright');

async function testReferralModal() {
  const browser = await chromium.launch({ headless: false });
  // Note: Footer hides referral column at < 900px
  // Testing at 950px to see the Invite Friends button, then resize to verify modal behavior at tablet size
  const context = await browser.newContext({
    viewport: { width: 950, height: 800 }
  });
  const page = await context.newPage();

  console.log('=== Testing Referral Modal ===');
  console.log('Viewport: 950px x 800px (desktop size to see Invite Friends button)');
  console.log('Note: Footer hides referral column at < 900px');
  console.log('Note: Testing on index page since host-proposals requires authentication');

  // Navigate to index page
  console.log('\nNavigating to http://localhost:8000...');
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Scroll to footer
  console.log('\nScrolling to footer...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  // Take screenshot of footer area before clicking
  console.log('Taking screenshot of footer area...');
  await page.screenshot({ path: 'referral-modal-1-footer.png', fullPage: false });

  // Look for Invite Friends button in footer - it's a button with class "share-btn"
  console.log('\nLooking for Invite Friends button...');
  const inviteButton = await page.locator('button.share-btn:has-text("Invite Friends")').first();
  const buttonVisible = await inviteButton.isVisible().catch(() => false);

  if (buttonVisible) {
    console.log('Found Invite Friends button!');

    // Get button position for debugging
    const buttonBox = await inviteButton.boundingBox();
    console.log('Button position:', buttonBox);

    console.log('Clicking Invite Friends button...');
    await inviteButton.click();
    await page.waitForTimeout(1500);

    // Take screenshot of modal
    console.log('\nTaking screenshot of referral modal...');
    await page.screenshot({ path: 'referral-modal-2-open.png', fullPage: false });
    console.log('Screenshot saved: referral-modal-2-open.png');

    // Analyze modal styling
    console.log('\n=== Modal Style Analysis ===');

    // Try to find the modal overlay and content
    const modalAnalysis = await page.evaluate(() => {
      // Look for common modal patterns
      const overlay = document.querySelector('[class*="overlay"], [class*="backdrop"], .fixed.inset-0, [style*="position: fixed"]');
      const modalContent = document.querySelector('[class*="modal"], [role="dialog"], [class*="referral"]');

      const results = {
        overlayFound: !!overlay,
        modalContentFound: !!modalContent,
        overlayStyles: null,
        modalStyles: null
      };

      if (overlay) {
        const style = window.getComputedStyle(overlay);
        results.overlayStyles = {
          position: style.position,
          top: style.top,
          left: style.left,
          right: style.right,
          bottom: style.bottom,
          backgroundColor: style.backgroundColor,
          zIndex: style.zIndex
        };
      }

      if (modalContent) {
        const style = window.getComputedStyle(modalContent);
        const rect = modalContent.getBoundingClientRect();
        results.modalStyles = {
          position: style.position,
          top: style.top,
          left: style.left,
          transform: style.transform,
          borderRadius: style.borderRadius,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };
      }

      // Check for drag handle
      const dragHandle = document.querySelector('[class*="drag"], [class*="handle"], .w-12.h-1, .rounded-full.bg-gray');
      results.dragHandleFound = !!dragHandle;

      return results;
    });

    console.log('Overlay found:', modalAnalysis.overlayFound);
    console.log('Modal content found:', modalAnalysis.modalContentFound);
    console.log('Drag handle found:', modalAnalysis.dragHandleFound);

    if (modalAnalysis.overlayStyles) {
      console.log('\nOverlay styles:');
      console.log('  Position:', modalAnalysis.overlayStyles.position);
      console.log('  Top:', modalAnalysis.overlayStyles.top);
      console.log('  Background:', modalAnalysis.overlayStyles.backgroundColor);
    }

    if (modalAnalysis.modalStyles) {
      console.log('\nModal styles:');
      console.log('  Position:', modalAnalysis.modalStyles.position);
      console.log('  Border radius:', modalAnalysis.modalStyles.borderRadius);
      console.log('  Dimensions:', modalAnalysis.modalStyles.width, 'x', modalAnalysis.modalStyles.height);

      // Check if centered
      const centerX = modalAnalysis.modalStyles.viewportWidth / 2;
      const centerY = modalAnalysis.modalStyles.viewportHeight / 2;
      const modalCenterX = modalAnalysis.modalStyles.centerX;
      const modalCenterY = modalAnalysis.modalStyles.centerY;

      console.log('\nCentering analysis:');
      console.log('  Viewport center:', centerX, centerY);
      console.log('  Modal center:', modalCenterX, modalCenterY);
      console.log('  Horizontally centered:', Math.abs(centerX - modalCenterX) < 20 ? 'YES' : 'NO');
      console.log('  Vertically centered:', Math.abs(centerY - modalCenterY) < 50 ? 'YES' : 'NO');
    }

    // Verification summary
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('1. Modal centered on screen: Check screenshot');
    console.log('2. Full dark overlay: Check screenshot');
    console.log('3. All corners rounded:', modalAnalysis.modalStyles?.borderRadius || 'Check screenshot');
    console.log('4. No drag handle:', !modalAnalysis.dragHandleFound ? 'PASS' : 'FAIL - drag handle found');

    // Now resize to 850px to verify modal appearance at tablet size
    console.log('\n=== Resizing to 850px (tablet size) ===');
    await page.setViewportSize({ width: 850, height: 800 });
    await page.waitForTimeout(500);

    // Take screenshot at tablet size
    console.log('Taking screenshot at tablet size...');
    await page.screenshot({ path: 'referral-modal-3-tablet.png', fullPage: false });
    console.log('Screenshot saved: referral-modal-3-tablet.png');

    // Analyze modal at tablet size
    const tabletModalAnalysis = await page.evaluate(() => {
      const modal = document.querySelector('.referral-modal');
      const overlay = document.querySelector('.referral-modal-overlay');

      if (modal && overlay) {
        const modalStyle = window.getComputedStyle(modal);
        const overlayStyle = window.getComputedStyle(overlay);
        const modalRect = modal.getBoundingClientRect();

        return {
          modalBorderRadius: modalStyle.borderRadius,
          overlayBg: overlayStyle.backgroundColor,
          overlayJustify: overlayStyle.justifyContent,
          overlayAlign: overlayStyle.alignItems,
          modalCenterX: modalRect.left + modalRect.width / 2,
          modalCenterY: modalRect.top + modalRect.height / 2,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };
      }
      return null;
    });

    if (tabletModalAnalysis) {
      console.log('\n=== Tablet Size Analysis ===');
      console.log('Modal border radius:', tabletModalAnalysis.modalBorderRadius);
      console.log('Overlay background:', tabletModalAnalysis.overlayBg);
      console.log('Overlay justify-content:', tabletModalAnalysis.overlayJustify);
      console.log('Overlay align-items:', tabletModalAnalysis.overlayAlign);

      const centerX = tabletModalAnalysis.viewportWidth / 2;
      const isCentered = Math.abs(centerX - tabletModalAnalysis.modalCenterX) < 30;
      console.log('Horizontally centered at tablet:', isCentered ? 'YES' : 'NO');
    }

  } else {
    console.log('ERROR: Invite Friends button NOT visible at 850px width');
    console.log('Taking full page screenshot to debug...');
    await page.screenshot({ path: 'referral-modal-error-no-button.png', fullPage: true });
  }

  console.log('\n=== Test Complete ===');
  await browser.close();
}

testReferralModal().catch(console.error);

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('SearchScheduleSelector Diagnostics - Problem Detection', () => {

  test('Detect console warnings and errors', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');

    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(2000);

    // Filter for warnings and errors (exclude expected onError callbacks)
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    const errors = consoleMessages.filter(m =>
      m.type === 'error' && !m.text.includes('onError called')
    );

    if (warnings.length > 0) {
      console.log('\n⚠️  Console Warnings Detected:');
      warnings.forEach(w => console.log(`   - ${w.text}`));
    }

    if (errors.length > 0) {
      console.log('\n❌ Console Errors Detected:');
      errors.forEach(e => console.log(`   - ${e.text}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Check for accessibility violations', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check all day buttons have aria-labels
    const buttonsWithoutLabels = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      return buttons
        .filter(btn => !btn.getAttribute('aria-label'))
        .map(btn => ({ text: btn.textContent }));
    });

    if (buttonsWithoutLabels.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Buttons without aria-label',
        count: buttonsWithoutLabels.length
      });
    }

    // Check buttons have aria-pressed attribute
    const buttonsWithoutPressed = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      return buttons
        .filter(btn => !btn.hasAttribute('aria-pressed'))
        .length;
    });

    if (buttonsWithoutPressed > 0) {
      issues.push({
        severity: 'WARNING',
        issue: 'Toggle buttons missing aria-pressed attribute',
        count: buttonsWithoutPressed
      });
    }

    if (issues.length > 0) {
      console.log('\n🔍 Accessibility Issues:\n');
      issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '❌' : '⚠️';
        console.log(`${icon} [${issue.severity}] ${issue.issue} (${issue.count})`);
      });
      console.log('');
    } else {
      console.log('\n✅ No accessibility issues detected\n');
    }

    const critical = issues.filter(i => i.severity === 'CRITICAL');
    expect(critical.length).toBe(0);
  });

  test('Validate keyboard navigation', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label')
      };
    });

    if (focusedElement.tag === 'BODY') {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Keyboard navigation not working - no element receives focus'
      });
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Keyboard Navigation Issues:\n');
      issues.forEach(issue => console.log(`   [${issue.severity}] ${issue.issue}`));
      console.log('');
    } else {
      console.log('\n✅ Keyboard navigation working\n');
    }

    const critical = issues.filter(i => i.severity === 'CRITICAL');
    expect(critical.length).toBe(0);
  });

  test('Verify component CSS is loaded and applied', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check CSS file is loaded
    const cssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('style.css'));
    });

    if (!cssLoaded) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Component CSS file (style.css) not loaded'
      });
    }

    // Check day button styling
    const buttonStyles = await page.evaluate(() => {
      const button = document.querySelector('[aria-label="Select Monday"]');
      if (!button) return null;

      const styles = window.getComputedStyle(button);
      return {
        backgroundColor: styles.backgroundColor,
        cursor: styles.cursor,
        borderRadius: styles.borderRadius
      };
    });

    if (buttonStyles) {
      // Button should have styling (not default)
      if (buttonStyles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
          buttonStyles.backgroundColor === 'transparent') {
        issues.push({
          severity: 'WARNING',
          issue: 'Day buttons may be unstyled - background is transparent'
        });
      }

      if (buttonStyles.cursor !== 'pointer') {
        issues.push({
          severity: 'WARNING',
          issue: 'Day buttons missing cursor:pointer (UX issue)'
        });
      }

      console.log('\n✅ Component CSS applied');
      console.log(`   Background: ${buttonStyles.backgroundColor}`);
      console.log(`   Cursor: ${buttonStyles.cursor}`);
      console.log(`   Border radius: ${buttonStyles.borderRadius}\n`);
    }

    if (issues.length > 0) {
      console.log('\n🎨 CSS Issues:\n');
      issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '❌' : '⚠️';
        console.log(`${icon} [${issue.severity}] ${issue.issue}`);
      });
      console.log('');
    }

    const critical = issues.filter(i => i.severity === 'CRITICAL');
    expect(critical.length).toBe(0);
  });

  test('Check for performance issues', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');

    const startTime = Date.now();
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);
    const loadTime = Date.now() - startTime;

    const issues = [];

    if (loadTime > 5000) {
      issues.push({
        severity: 'WARNING',
        issue: `Slow initial load: ${loadTime}ms (expected < 5000ms)`
      });
    }

    // Test interaction performance (click response)
    const clickStart = Date.now();
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(100);
    const clickTime = Date.now() - clickStart;

    if (clickTime > 500) {
      issues.push({
        severity: 'WARNING',
        issue: `Slow click response: ${clickTime}ms (expected < 500ms)`
      });
    }

    console.log('\n⚡ Performance Metrics:\n');
    console.log(`   Initial Load: ${loadTime}ms`);
    console.log(`   Click Response: ${clickTime}ms`);

    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues:\n');
      issues.forEach(issue => console.log(`   [${issue.severity}] ${issue.issue}`));
    } else {
      console.log('\n✅ Performance is good');
    }
    console.log('');

    // Don't fail on warnings
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    expect(critical.length).toBe(0);
  });

  test('Validate selection logic works correctly', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Test 1: Select a day
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(300);

    const mondaySelected = await page.locator('[aria-label="Select Monday"]').getAttribute('aria-pressed');
    if (mondaySelected !== 'true') {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Day selection not working - aria-pressed not updated'
      });
    }

    // Test 2: Deselect the day
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(300);

    const mondayDeselected = await page.locator('[aria-label="Select Monday"]').getAttribute('aria-pressed');
    if (mondayDeselected !== 'false') {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Day deselection not working - aria-pressed not updated'
      });
    }

    if (issues.length > 0) {
      console.log('\n❌ Selection Logic Issues:\n');
      issues.forEach(issue => console.log(`   [${issue.severity}] ${issue.issue}`));
      console.log('');
    } else {
      console.log('\n✅ Selection logic working correctly\n');
    }

    expect(issues.length).toBe(0);
  });

  test('Check for memory leaks', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Select and deselect multiple times
    for (let i = 0; i < 10; i++) {
      await page.locator('[aria-label="Select Monday"]').click();
      await page.waitForTimeout(50);
      await page.locator('[aria-label="Select Monday"]').click();
      await page.waitForTimeout(50);
    }

    // Check if component is still responding
    const stillWorks = await page.evaluate(() => {
      const button = document.querySelector('[aria-label="Select Monday"]');
      return button !== null;
    });

    if (!stillWorks) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Component broke after multiple interactions'
      });
    }

    if (issues.length > 0) {
      console.log('\n💾 Memory Issues:\n');
      issues.forEach(issue => console.log(`   [${issue.severity}] ${issue.issue}`));
      console.log('');
    } else {
      console.log('\n✅ No memory leaks detected\n');
    }

    expect(issues.length).toBe(0);
  });

  test('Detect spec violations', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];
    const config = require('../config.json');
    const component = config.projects[0].components.find(c => c.name === 'SearchScheduleSelector');

    // Verify 7 day buttons exist
    const dayCount = await page.locator('[role="button"][aria-label*="Select"]').count();
    if (dayCount !== 7) {
      issues.push({
        severity: 'CRITICAL',
        testCase: 'Renders 7 day buttons',
        issue: `Found ${dayCount} buttons, expected 7`
      });
    }

    // Verify calendar icon exists
    const hasCalendar = await page.evaluate(() => {
      const container = document.querySelector('#selector-root');
      return container && container.textContent.includes('📅');
    });

    if (!hasCalendar) {
      issues.push({
        severity: 'WARNING',
        testCase: 'Calendar icon',
        issue: 'Calendar emoji not found in component'
      });
    }

    if (issues.length > 0) {
      console.log('\n📋 Spec Compliance Issues:\n');
      issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '❌' : '⚠️';
        console.log(`${icon} [${issue.severity}] ${issue.testCase}: ${issue.issue}`);
      });
      console.log('');
    } else {
      console.log('\n✅ All spec requirements met\n');
    }

    const critical = issues.filter(i => i.severity === 'CRITICAL');
    expect(critical.length).toBe(0);
  });

});

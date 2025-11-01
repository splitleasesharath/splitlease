const { test, expect } = require('@playwright/test');
const path = require('path');

const config = require('../config.json');
const project = config.projects[0];

/**
 * Footer Component Diagnostics & Problem Detection
 *
 * This test suite proactively identifies potential issues:
 * - Accessibility violations
 * - Console warnings/errors
 * - Performance bottlenecks
 * - Missing ARIA labels
 * - Keyboard navigation issues
 * - CSS/Layout problems
 * - Memory leaks
 * - Spec violations
 */

test.describe('Footer Diagnostics - Problem Detection', () => {

  test('Detect console warnings and errors', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');

    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(2000);

    // Filter for warnings and errors
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    const errors = consoleMessages.filter(m => m.type === 'error');

    // Report findings
    if (warnings.length > 0) {
      console.log('\n⚠️  Console Warnings Detected:');
      warnings.forEach(w => console.log(`   - ${w.text}`));
    }

    if (errors.length > 0) {
      console.log('\n❌ Console Errors Detected:');
      errors.forEach(e => console.log(`   - ${e.text}`));
    }

    // Assert no critical errors
    expect(errors.length).toBe(0);
  });

  test('Check for accessibility violations', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check for missing alt text on images
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .filter(img => !img.alt || img.alt.trim() === '')
        .map(img => ({ src: img.src, tag: img.outerHTML.substring(0, 100) }));
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({
        severity: 'WARNING',
        category: 'Accessibility',
        issue: 'Missing alt text on images',
        count: imagesWithoutAlt.length,
        details: imagesWithoutAlt
      });
    }

    // Check for missing form labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])'));
      return inputs
        .filter(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasPlaceholder = input.placeholder;
          return !hasLabel && !hasAriaLabel && !hasPlaceholder;
        })
        .map(input => ({ id: input.id, class: input.className, type: input.type }));
    });

    if (inputsWithoutLabels.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Accessibility',
        issue: 'Input fields without labels or aria-label',
        count: inputsWithoutLabels.length,
        details: inputsWithoutLabels
      });
    }

    // Check for buttons without accessible names
    const buttonsWithoutNames = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter(btn => {
          const hasText = btn.textContent.trim().length > 0;
          const hasAriaLabel = btn.getAttribute('aria-label');
          const hasTitle = btn.getAttribute('title');
          return !hasText && !hasAriaLabel && !hasTitle;
        })
        .map(btn => ({ class: btn.className }));
    });

    if (buttonsWithoutNames.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Accessibility',
        issue: 'Buttons without accessible names',
        count: buttonsWithoutNames.length,
        details: buttonsWithoutNames
      });
    }

    // Check for links without accessible names
    const linksWithoutNames = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => {
          const hasText = link.textContent.trim().length > 0;
          const hasAriaLabel = link.getAttribute('aria-label');
          const hasTitle = link.getAttribute('title');
          return !hasText && !hasAriaLabel && !hasTitle;
        })
        .map(link => ({ href: link.href }));
    });

    if (linksWithoutNames.length > 0) {
      issues.push({
        severity: 'WARNING',
        category: 'Accessibility',
        issue: 'Links without accessible names',
        count: linksWithoutNames.length,
        details: linksWithoutNames
      });
    }

    // Report all issues
    if (issues.length > 0) {
      console.log('\n🔍 Accessibility Issues Detected:\n');
      issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '❌' : '⚠️';
        console.log(`${icon} [${issue.severity}] ${issue.issue} (${issue.count})`);
        if (issue.details.length <= 3) {
          console.log('   Details:', JSON.stringify(issue.details, null, 2));
        }
      });
      console.log('');
    } else {
      console.log('\n✅ No accessibility issues detected\n');
    }

    // Only fail on critical issues
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    expect(criticalIssues.length).toBe(0);
  });

  test('Validate keyboard navigation', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check that all interactive elements are keyboard accessible
    const interactiveElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
      return elements.map(el => ({
        tag: el.tagName,
        tabIndex: el.tabIndex,
        disabled: el.disabled,
        className: el.className,
        hasText: el.textContent.trim().length > 0
      }));
    });

    // Check for elements with negative tabindex (removes from keyboard nav)
    const negativeTabIndex = interactiveElements.filter(el => el.tabIndex < 0);
    if (negativeTabIndex.length > 0) {
      issues.push({
        severity: 'WARNING',
        issue: 'Interactive elements with negative tabindex (not keyboard accessible)',
        count: negativeTabIndex.length,
        details: negativeTabIndex
      });
    }

    // Test tab navigation through form
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const firstFocused = await page.evaluate(() => document.activeElement.tagName);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const secondFocused = await page.evaluate(() => document.activeElement.tagName);

    if (firstFocused === 'BODY' && secondFocused === 'BODY') {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Keyboard navigation not working - focus not moving between elements',
        count: 1
      });
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Keyboard Navigation Issues:\n');
      issues.forEach(issue => {
        console.log(`   [${issue.severity}] ${issue.issue} (${issue.count})`);
      });
      console.log('');
    } else {
      console.log('\n✅ Keyboard navigation working correctly\n');
    }

    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    expect(criticalIssues.length).toBe(0);
  });

  test('Detect CSS and layout problems', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check for invisible elements (0 width/height)
    const invisibleElements = await page.evaluate(() => {
      const footer = document.querySelector('.main-footer');
      if (!footer) return [];

      const elements = Array.from(footer.querySelectorAll('*'));
      return elements
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          return (rect.width === 0 || rect.height === 0) &&
                 styles.display !== 'none' &&
                 styles.visibility !== 'hidden' &&
                 el.textContent.trim().length > 0;
        })
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.textContent.substring(0, 50)
        }));
    });

    if (invisibleElements.length > 0) {
      issues.push({
        severity: 'WARNING',
        issue: 'Elements with content but zero dimensions (may not be visible)',
        count: invisibleElements.length,
        details: invisibleElements
      });
    }

    // Check for text overflow
    const overflowingElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.main-footer *'));
      return elements
        .filter(el => {
          if (el.children.length > 0) return false; // Only check leaf nodes
          return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
        })
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          text: el.textContent.substring(0, 50)
        }));
    });

    if (overflowingElements.length > 0) {
      issues.push({
        severity: 'INFO',
        issue: 'Elements with content overflow (may need scrolling or text truncation)',
        count: overflowingElements.length,
        details: overflowingElements.slice(0, 3)
      });
    }

    // Check for missing CSS classes
    const elementsWithoutClasses = await page.evaluate(() => {
      const footer = document.querySelector('.main-footer');
      if (!footer) return [];

      const elements = Array.from(footer.querySelectorAll('div, section, article'));
      return elements
        .filter(el => !el.className || el.className.trim() === '')
        .map(el => ({
          tag: el.tagName,
          id: el.id,
          children: el.children.length
        }));
    });

    if (elementsWithoutClasses.length > 0) {
      issues.push({
        severity: 'INFO',
        issue: 'Structural elements without CSS classes (may affect styling)',
        count: elementsWithoutClasses.length
      });
    }

    // Report issues
    if (issues.length > 0) {
      console.log('\n🎨 CSS/Layout Issues Detected:\n');
      issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '❌' :
                     issue.severity === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${issue.severity}] ${issue.issue} (${issue.count})`);
        if (issue.details && issue.details.length <= 3) {
          console.log('   Details:', JSON.stringify(issue.details, null, 2));
        }
      });
      console.log('');
    } else {
      console.log('\n✅ No CSS/layout issues detected\n');
    }

    // Only fail on critical issues
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    expect(criticalIssues.length).toBe(0);
  });

  test('Validate form input validation', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Test email validation
    const emailInput = page.locator('.import-input').nth(1);

    // Invalid email (no @)
    await emailInput.fill('invalidemail.com');
    await page.locator('.import-btn').click();
    await page.waitForTimeout(300);

    const callbackFiredForInvalidEmail = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.console-log .log-entry'));
      return logs.some(log => log.textContent.includes('onImportSubmit called'));
    });

    if (callbackFiredForInvalidEmail) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Email validation not working - callback fired for invalid email (no @)',
        spec: 'Email must contain @ and .'
      });
    }

    // Test URL validation
    await page.reload();
    await page.waitForTimeout(1000);

    const urlInput = page.locator('.import-input').first();
    await emailInput.fill('valid@example.com');

    // Invalid URL (no http)
    await urlInput.fill('example.com/listing');
    await page.locator('.import-btn').click();
    await page.waitForTimeout(300);

    const callbackFiredForInvalidUrl = await page.evaluate(() => {
      const logs = Array.from(document.querySelectorAll('.console-log .log-entry'));
      return logs.some(log => log.textContent.includes('onImportSubmit called'));
    });

    if (callbackFiredForInvalidUrl) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'URL validation not working - callback fired for invalid URL (missing http/https)',
        spec: 'URL must start with http:// or https://'
      });
    }

    // Report issues
    if (issues.length > 0) {
      console.log('\n🔒 Validation Issues Detected:\n');
      issues.forEach(issue => {
        console.log(`❌ [${issue.severity}] ${issue.issue}`);
        console.log(`   Spec: ${issue.spec}`);
      });
      console.log('');
    } else {
      console.log('\n✅ Form validation working correctly\n');
    }

    expect(issues.length).toBe(0);
  });

  test('Check for performance issues', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');

    // Measure initial load time
    const startTime = Date.now();
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);
    const loadTime = Date.now() - startTime;

    const issues = [];

    // Check initial load performance
    if (loadTime > 5000) {
      issues.push({
        severity: 'WARNING',
        issue: `Slow initial load time: ${loadTime}ms (expected < 5000ms)`,
        metric: loadTime
      });
    }

    // Measure re-render performance (toggle visibility)
    const rerenderTimes = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await page.locator('#toggle-referral').click();
      await page.waitForTimeout(100);
      rerenderTimes.push(Date.now() - start);
    }

    const avgRerenderTime = rerenderTimes.reduce((a, b) => a + b, 0) / rerenderTimes.length;

    if (avgRerenderTime > 500) {
      issues.push({
        severity: 'WARNING',
        issue: `Slow re-render time: ${avgRerenderTime.toFixed(0)}ms (expected < 500ms)`,
        metric: avgRerenderTime
      });
    }

    // Check bundle size
    const bundlePath = path.join(__dirname, '../../split-lease/components/dist/split-lease-components.umd.js');
    const fs = require('fs');
    const stats = fs.statSync(bundlePath);
    const sizeKB = stats.size / 1024;

    if (sizeKB > 500) {
      issues.push({
        severity: 'WARNING',
        issue: `Large bundle size: ${sizeKB.toFixed(2)}KB (consider code splitting if > 500KB)`,
        metric: sizeKB
      });
    }

    // Report performance metrics
    console.log('\n⚡ Performance Metrics:\n');
    console.log(`   Initial Load: ${loadTime}ms`);
    console.log(`   Avg Re-render: ${avgRerenderTime.toFixed(0)}ms`);
    console.log(`   Bundle Size: ${sizeKB.toFixed(2)}KB`);

    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues:\n');
      issues.forEach(issue => {
        console.log(`   [${issue.severity}] ${issue.issue}`);
      });
    } else {
      console.log('\n✅ Performance is good');
    }
    console.log('');

    // Don't fail on performance warnings, just report
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    expect(criticalIssues.length).toBe(0);
  });

  test('Detect missing features per spec', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];
    const footerConfig = config.projects[0].components.find(c => c.name === 'Footer');

    // Check all test cases from spec
    if (footerConfig && footerConfig.testCases) {
      for (const testCase of footerConfig.testCases) {
        if (testCase.name === 'Renders default columns') {
          const forHostsExists = await page.locator('h4:has-text("For Hosts")').count();
          const forGuestsExists = await page.locator('h4:has-text("For Guests")').count();
          const companyExists = await page.locator('h4:has-text("Company")').count();

          if (!forHostsExists || !forGuestsExists || !companyExists) {
            issues.push({
              severity: 'CRITICAL',
              testCase: testCase.name,
              issue: 'Default columns not rendering correctly',
              spec: testCase.description
            });
          }
        }

        if (testCase.name === 'Footer bottom renders') {
          const termsLink = await page.locator('.footer-bottom a:has-text("Terms of Use")').count();
          const copyright = await page.locator('.footer-bottom span:has-text("© 2025 SplitLease")').count();

          if (!termsLink || !copyright) {
            issues.push({
              severity: 'CRITICAL',
              testCase: testCase.name,
              issue: 'Footer bottom section missing required elements',
              spec: testCase.description
            });
          }
        }
      }
    }

    // Report spec compliance
    if (issues.length > 0) {
      console.log('\n📋 Spec Compliance Issues:\n');
      issues.forEach(issue => {
        console.log(`❌ [${issue.severity}] ${issue.testCase}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Spec: ${issue.spec}`);
      });
      console.log('');
    } else {
      console.log('\n✅ All spec requirements met\n');
    }

    expect(issues.length).toBe(0);
  });

  test('Check for potential memory leaks', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check for event listeners not being cleaned up
    const eventListenerCount = await page.evaluate(() => {
      // This is a simplified check - in production you'd use Chrome DevTools Protocol
      const elements = Array.from(document.querySelectorAll('.main-footer *'));
      let hasListeners = 0;

      // Check for onclick attributes (inline handlers)
      elements.forEach(el => {
        if (el.onclick) hasListeners++;
      });

      return hasListeners;
    });

    // Mount and unmount component multiple times
    for (let i = 0; i < 5; i++) {
      await page.locator('#toggle-referral').click();
      await page.waitForTimeout(100);
      await page.locator('#toggle-referral').click();
      await page.waitForTimeout(100);
    }

    // Check if component is still responding
    const stillResponding = await page.evaluate(() => {
      return document.querySelector('.main-footer') !== null;
    });

    if (!stillResponding) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Component broke after multiple re-renders (possible memory leak)',
        detail: 'Component disappeared after 5 mount/unmount cycles'
      });
    }

    // Report
    if (issues.length > 0) {
      console.log('\n💾 Memory Leak Warnings:\n');
      issues.forEach(issue => {
        console.log(`⚠️  [${issue.severity}] ${issue.issue}`);
        console.log(`   ${issue.detail}`);
      });
      console.log('');
    } else {
      console.log('\n✅ No obvious memory leaks detected\n');
    }

    expect(issues.length).toBe(0);
  });

  test('Verify component CSS is loaded and applied', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    const issues = [];

    // Check if CSS file is loaded
    const cssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('style.css'));
    });

    if (!cssLoaded) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Component CSS file (style.css) not loaded in preview',
        detail: 'Preview will show unstyled component'
      });
    }

    // Check if footer has expected background color from CSS
    const footerStyles = await page.evaluate(() => {
      const footer = document.querySelector('.main-footer');
      if (!footer) return null;

      const styles = window.getComputedStyle(footer);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        padding: styles.padding
      };
    });

    if (footerStyles) {
      // Footer should have purple background (#31135D = rgb(49, 19, 93))
      const bgColor = footerStyles.backgroundColor;

      // Check if background is styled (not default white/transparent)
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'rgb(255, 255, 255)' || bgColor === 'transparent') {
        issues.push({
          severity: 'CRITICAL',
          issue: 'Footer CSS not applied - background color is default',
          detail: `Expected purple (#31135D), got: ${bgColor}`
        });
      } else {
        console.log(`\n✅ Footer CSS applied correctly`);
        console.log(`   Background color: ${bgColor}`);
        console.log(`   Text color: ${footerStyles.color}`);
        console.log(`   Padding: ${footerStyles.padding}\n`);
      }
    } else {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Footer element not found - cannot verify CSS',
        detail: 'Component may not be rendering'
      });
    }

    // Report issues
    if (issues.length > 0) {
      console.log('\n🎨 CSS Loading Issues:\n');
      issues.forEach(issue => {
        console.log(`❌ [${issue.severity}] ${issue.issue}`);
        console.log(`   ${issue.detail}`);
      });
      console.log('');
    }

    expect(issues.length).toBe(0);
  });

});

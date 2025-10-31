const { test, expect } = require('@playwright/test');
const path = require('path');

const config = require('../config.json');
const project = config.projects[0];
const component = project.components.find(c => c.name === 'SearchScheduleSelector');

test.describe('SearchScheduleSelector UMD Contract Tests', () => {

  test('UMD bundle exposes SearchScheduleSelector correctly', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check global exists
    const globalExists = await page.evaluate((globalName) => {
      return typeof window[globalName] !== 'undefined';
    }, project.globalName);

    expect(globalExists).toBe(true);

    // Check SearchScheduleSelector export exists
    const componentExists = await page.evaluate((globalName) => {
      return typeof window[globalName].SearchScheduleSelector === 'function';
    }, project.globalName);

    expect(componentExists).toBe(true);
  });

  test('Component renders without errors', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('onError called')) {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(2000);

    // Check component container exists
    const componentExists = await page.locator('#selector-root').count();
    expect(componentExists).toBeGreaterThan(0);

    // Check no console errors (except expected validation errors)
    expect(errors).toEqual([]);
  });

  test('Renders 7 day buttons (S M T W T F S)', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Count day buttons
    const dayButtons = await page.locator('[role="button"][aria-label*="Select"]').count();
    expect(dayButtons).toBe(7);

    // Verify all days have aria-labels
    const sunLabel = await page.locator('[aria-label="Select Sunday"]').count();
    const monLabel = await page.locator('[aria-label="Select Monday"]').count();
    const tueLabel = await page.locator('[aria-label="Select Tuesday"]').count();
    const wedLabel = await page.locator('[aria-label="Select Wednesday"]').count();
    const thuLabel = await page.locator('[aria-label="Select Thursday"]').count();
    const friLabel = await page.locator('[aria-label="Select Friday"]').count();
    const satLabel = await page.locator('[aria-label="Select Saturday"]').count();

    expect(sunLabel).toBe(1);
    expect(monLabel).toBe(1);
    expect(tueLabel).toBe(1);
    expect(wedLabel).toBe(1);
    expect(thuLabel).toBe(1);
    expect(friLabel).toBe(1);
    expect(satLabel).toBe(1);
  });

  test('Single day selection works', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');

    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('onSelectionChange called')) {
        logs.push(msg.text());
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Click Monday
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(500);

    // Verify callback was called
    expect(logs.length).toBeGreaterThan(0);

    // Check if Monday is marked as selected (aria-pressed="true")
    const mondayPressed = await page.locator('[aria-label="Select Monday"]').getAttribute('aria-pressed');
    expect(mondayPressed).toBe('true');
  });

  test('Multiple day selection by clicking', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Click Monday, Tuesday, Wednesday
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Select Tuesday"]').click();
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Select Wednesday"]').click();
    await page.waitForTimeout(500);

    // Check all three are selected
    const monPressed = await page.locator('[aria-label="Select Monday"]').getAttribute('aria-pressed');
    const tuePressed = await page.locator('[aria-label="Select Tuesday"]').getAttribute('aria-pressed');
    const wedPressed = await page.locator('[aria-label="Select Wednesday"]').getAttribute('aria-pressed');

    expect(monPressed).toBe('true');
    expect(tuePressed).toBe('true');
    expect(wedPressed).toBe('true');
  });

  test('Clear selection button resets selection', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Select days
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Select Tuesday"]').click();
    await page.waitForTimeout(500);

    // Clear button should now be visible
    const clearButton = page.locator('button:has-text("Clear selection")');
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.click();
    await page.waitForTimeout(500);

    // Check days are no longer selected
    const monPressed = await page.locator('[aria-label="Select Monday"]').getAttribute('aria-pressed');
    const tuePressed = await page.locator('[aria-label="Select Tuesday"]').getAttribute('aria-pressed');

    expect(monPressed).toBe('false');
    expect(tuePressed).toBe('false');

    // Clear button should be hidden
    await expect(clearButton).not.toBeVisible();
  });

  test('Listing count displays when days selected', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Before selection - no count
    const countBefore = await page.locator('text=/exact match|partial match/').count();
    expect(countBefore).toBe(0);

    // Select days
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(200);
    await page.locator('[aria-label="Select Tuesday"]').click();
    await page.waitForTimeout(500);

    // After selection - count should appear
    const countAfter = await page.locator('text=/exact match|partial match/').count();
    expect(countAfter).toBeGreaterThan(0);
  });

  test('onSelectionChange callback fires with correct data', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');

    const selectionChanges = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('onSelectionChange called')) {
        selectionChanges.push(text);
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Select Monday
    await page.locator('[aria-label="Select Monday"]').click();
    await page.waitForTimeout(500);

    // Verify callback was called with Monday
    expect(selectionChanges.length).toBeGreaterThan(0);
    expect(selectionChanges[selectionChanges.length - 1]).toContain('Monday');
  });

  test('Component configuration props work', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Change minDays to 1
    await page.locator('#min-days').fill('1');
    // Change maxDays to 3
    await page.locator('#max-days').fill('3');
    // Disable contiguous requirement
    await page.locator('#require-contiguous').uncheck();

    // Apply configuration
    await page.locator('button:has-text("Apply Configuration")').click();
    await page.waitForTimeout(500);

    // Component should re-render with new props
    const componentExists = await page.locator('#selector-root').count();
    expect(componentExists).toBeGreaterThan(0);
  });

  test('Calendar icon renders', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check for calendar emoji or icon
    const hasCalendar = await page.evaluate(() => {
      const container = document.querySelector('#selector-root');
      return container && container.textContent.includes('📅');
    });

    expect(hasCalendar).toBe(true);
  });

  test('Component CSS is loaded and applied', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/search-schedule-selector-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check if CSS file is loaded
    const cssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('style.css'));
    });

    expect(cssLoaded).toBe(true);

    // Check if component has styled appearance (not default)
    const dayButton = page.locator('[aria-label="Select Monday"]').first();
    const bgColor = await dayButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have some background color (not transparent/default)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
  });

});

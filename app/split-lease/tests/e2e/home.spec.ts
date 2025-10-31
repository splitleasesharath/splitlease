/**
 * E2E tests for home page
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load home page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/SplitLease/i);
  });

  test('should display header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should navigate to search page', async ({ page }) => {
    await page.click('a[href="/search"]');
    await expect(page).toHaveURL(/.*search/);
  });

  test('should be accessible', async ({ page }) => {
    // Basic accessibility check (can be expanded with axe-core)
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });
});

/**
 * E2E tests for search/listings page
 */

import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
  });

  test('should load search page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/.*search/);
  });

  test('should display search schedule selector', async ({ page }) => {
    const selector = page.locator('#search-selector-island');
    await expect(selector).toBeVisible();
  });

  test('should display listing results', async ({ page }) => {
    // Wait for listings to load (adjust selector as needed)
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 5000 });
    const listings = page.locator('[data-testid="listing-card"]');
    await expect(listings).toHaveCount(await listings.count());
  });

  test('should filter listings by schedule', async ({ page }) => {
    // Click weeknights filter (adjust selector as needed)
    await page.click('[data-testid="filter-weeknights"]');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify URL has filter parameter
    const url = page.url();
    expect(url).toContain('weeknights');
  });

  test('should navigate to listing detail page', async ({ page }) => {
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 5000 });
    const firstListing = page.locator('[data-testid="listing-card"]').first();
    await firstListing.click();

    await expect(page).toHaveURL(/.*view-split-lease/);
  });
});

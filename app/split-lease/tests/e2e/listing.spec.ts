/**
 * E2E tests for listing detail page
 */

import { test, expect } from '@playwright/test';

test.describe('Listing Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a listing detail page (with mock ID)
    await page.goto('/view-split-lease?id=test-listing-id');
  });

  test('should load listing detail page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/.*view-split-lease/);
  });

  test('should display listing image grid', async ({ page }) => {
    const imageGrid = page.locator('#listing-image-grid-island');
    await expect(imageGrid).toBeVisible();
  });

  test('should display listing details', async ({ page }) => {
    // Check for key listing information elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="listing-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-description"]')).toBeVisible();
  });

  test('should display proposal menu for authenticated users', async ({ page }) => {
    // This would require authentication setup
    // For now, check if the proposal menu island exists
    const proposalMenu = page.locator('#proposal-menu-island');
    await expect(proposalMenu).toBeVisible();
  });

  test('should open image lightbox on image click', async ({ page }) => {
    const imageGrid = page.locator('#listing-image-grid-island');
    await imageGrid.waitFor({ state: 'visible' });

    // Click first image
    const firstImage = imageGrid.locator('img').first();
    await firstImage.click();

    // Check if lightbox or modal opened (adjust selector as needed)
    const lightbox = page.locator('[data-testid="image-lightbox"]');
    await expect(lightbox).toBeVisible();
  });

  test('should submit proposal', async ({ page }) => {
    // Fill out proposal form
    await page.fill('[data-testid="proposed-price"]', '150');
    await page.fill('[data-testid="proposal-message"]', 'I would like to book this property');

    // Submit proposal
    await page.click('[data-testid="submit-proposal"]');

    // Check for success message
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible();
  });
});

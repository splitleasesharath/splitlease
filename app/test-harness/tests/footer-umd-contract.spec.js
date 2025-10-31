const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const config = require('../config.json');
const project = config.projects[0]; // split-lease
const footerComponent = project.components.find(c => c.name === 'Footer');

test.describe('Footer UMD Contract Tests', () => {

  test('UMD bundle exposes Footer component correctly', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);

    // Wait for component to load
    await page.waitForTimeout(1000);

    // Check global exists
    const globalExists = await page.evaluate((globalName) => {
      return typeof window[globalName] !== 'undefined';
    }, project.globalName);

    expect(globalExists).toBe(true);

    // Check Footer export exists
    const footerExists = await page.evaluate((globalName) => {
      return typeof window[globalName].Footer === 'function';
    }, project.globalName);

    expect(footerExists).toBe(true);
  });

  test('Footer component renders without errors', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(2000);

    // Check for footer element
    const footerExists = await page.locator('.main-footer').count();
    expect(footerExists).toBeGreaterThan(0);

    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('Footer renders default columns', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check for column headers
    const forHosts = await page.locator('h4:has-text("For Hosts")').count();
    const forGuests = await page.locator('h4:has-text("For Guests")').count();
    const company = await page.locator('h4:has-text("Company")').count();

    expect(forHosts).toBe(1);
    expect(forGuests).toBe(1);
    expect(company).toBe(1);
  });

  test('Referral form renders and accepts input', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check referral section exists
    const referralSection = await page.locator('h4:has-text("Refer a friend")').count();
    expect(referralSection).toBe(1);

    // Check radio buttons exist
    const textRadio = await page.locator('input[type="radio"][value="text"]').count();
    const emailRadio = await page.locator('input[type="radio"][value="email"]').count();
    expect(textRadio).toBe(1);
    expect(emailRadio).toBe(1);

    // Check input field exists
    const referralInput = await page.locator('.referral-input').count();
    expect(referralInput).toBe(1);

    // Check share button exists
    const shareButton = await page.locator('.share-btn').count();
    expect(shareButton).toBe(1);
  });

  test('Import form renders with validation', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check import section exists
    const importSection = await page.locator('h4:has-text("Import your listing from another site")').count();
    expect(importSection).toBe(1);

    // Check input fields exist
    const urlInput = await page.locator('.import-input').first().count();
    const emailInput = await page.locator('.import-input').nth(1).count();
    expect(urlInput).toBe(1);
    expect(emailInput).toBe(1);

    // Check submit button exists
    const submitButton = await page.locator('.import-btn').count();
    expect(submitButton).toBe(1);
  });

  test('Footer bottom section renders', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Check footer bottom exists
    const footerBottom = await page.locator('.footer-bottom').count();
    expect(footerBottom).toBe(1);

    // Check Terms of Use link
    const termsLink = await page.locator('.footer-bottom a:has-text("Terms of Use")').count();
    expect(termsLink).toBe(1);

    // Check copyright text
    const copyright = await page.locator('.footer-bottom span:has-text("© 2025 SplitLease")').count();
    expect(copyright).toBe(1);

    // Check footer note
    const footerNote = await page.locator('.footer-bottom span:has-text("Made with love in New York City")').count();
    expect(footerNote).toBe(1);
  });

  test('Referral form interaction triggers callback', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');

    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('onReferralSubmit called')) {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Fill referral input
    await page.locator('.referral-input').fill('test@example.com');

    // Click share button
    await page.locator('.share-btn').click();

    await page.waitForTimeout(500);

    // Verify callback was logged
    expect(consoleLogs.length).toBeGreaterThan(0);
    expect(consoleLogs[0]).toContain('onReferralSubmit called');
  });

  test('Import form interaction triggers callback', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');

    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('onImportSubmit called')) {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Fill import form with valid data
    await page.locator('.import-input').first().fill('https://example.com/listing');
    await page.locator('.import-input').nth(1).fill('test@example.com');

    // Click submit button
    await page.locator('.import-btn').click();

    await page.waitForTimeout(500);

    // Verify callback was logged
    expect(consoleLogs.length).toBeGreaterThan(0);
    expect(consoleLogs[0]).toContain('onImportSubmit called');
  });

  test('Component configuration toggles work', async ({ page }) => {
    const previewPath = path.join(__dirname, '../previews/footer-preview.html');
    await page.goto(`file://${previewPath}`);
    await page.waitForTimeout(1000);

    // Initially referral should be visible
    let referralVisible = await page.locator('h4:has-text("Refer a friend")').count();
    expect(referralVisible).toBe(1);

    // Toggle referral off
    await page.locator('#toggle-referral').click();
    await page.waitForTimeout(500);

    // Referral should be hidden
    referralVisible = await page.locator('h4:has-text("Refer a friend")').count();
    expect(referralVisible).toBe(0);

    // Initially import should be visible
    let importVisible = await page.locator('h4:has-text("Import your listing from another site")').count();
    expect(importVisible).toBe(1);

    // Toggle import off
    await page.locator('#toggle-import').click();
    await page.waitForTimeout(500);

    // Import should be hidden
    importVisible = await page.locator('h4:has-text("Import your listing from another site")').count();
    expect(importVisible).toBe(0);
  });

});

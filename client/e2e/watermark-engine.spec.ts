import { test, expect } from '@playwright/test';

test.describe('💧 Multi-Page Watermarking Engine Functional Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  });

  test('should open watermark modal and apply custom text', async ({ page }) => {
    // 1. Click Watermark trigger button in Secondary Ribbon
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const watermarkBtn = btns.find(b => 
        (b.title && b.title.toLowerCase().includes('watermark')) ||
        (b.getAttribute('aria-label') && b.getAttribute('aria-label')!.toLowerCase().includes('watermark')) ||
        b.outerHTML.includes('Droplet') ||
        b.outerHTML.includes('droplet') ||
        b.outerHTML.includes('Watermark')
      );
      if (watermarkBtn) watermarkBtn.click();
    });

    // 2. Locate input text inside WatermarkModal
    const textInput = page.locator('input[type="text"]').first();
    await expect(textInput).toBeVisible({ timeout: 5000 });

    // 3. Fill custom watermark text
    await textInput.fill('CONFIDENTIAL - TEST SPEC');

    // 4. Click Stamp Watermark button
    const applyBtn = page.locator('button', { hasText: /Stamp|Apply/i }).first();
    await applyBtn.click({ force: true });
  });
});
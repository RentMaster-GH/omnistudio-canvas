import { test, expect } from '@playwright/test';

test.describe('🎨 Brand Color Swatches Functional Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  });

  test('should render 5 default swatches and update active hex code', async ({ page }) => {
    // Target the 5 swatch buttons directly
    const swatchButtons = page.locator('button[title*="Apply"]');
    await expect(swatchButtons.first()).toBeVisible({ timeout: 10000 });

    // Verify exactly 5 swatch buttons exist
    await expect(swatchButtons).toHaveCount(5);

    // Click 2nd swatch button (#2563eb)
    await swatchButtons.nth(1).dispatchEvent('click');

    // Verify active hex text indicator updates to #2563eb
    const activeHex = page.locator('span', { hasText: /2563eb/i });
    await expect(activeHex).toBeVisible({ timeout: 5000 });
  });
});
import { test, expect } from '@playwright/test';

test.describe('📏 Precision Screen Ruler Functional Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  });

  test('should toggle ruler overlay and switch units (px, mm, in)', async ({ page }) => {
    const rulerBtn = page.locator('button', { hasText: /Precision Ruler/i }).first();
    await expect(rulerBtn).toBeVisible({ timeout: 10000 });

    // Toggle ON
    await rulerBtn.click({ force: true });

    // Use { force: true } for unit clicks while overlay is active
    const pxBtn = page.getByRole('button', { name: 'px', exact: true });
    const mmBtn = page.getByRole('button', { name: 'mm', exact: true });
    const inBtn = page.getByRole('button', { name: 'in', exact: true });

    await expect(mmBtn).toBeVisible();
    await inBtn.click({ force: true });
    await pxBtn.click({ force: true });
  });
});
import { test, expect } from '@playwright/test';

test.describe('⚡ Performance Profiling & Canvas Action Load Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  });

  test('should execute button actions efficiently', async ({ page }) => {
    const swatchBtn = page.locator('button[title*="Apply"]').or(page.locator('input[type="color"]')).first();
    await expect(swatchBtn).toBeVisible({ timeout: 10000 });

    const startTime = await page.evaluate(() => performance.now());
    await swatchBtn.dispatchEvent('click');
    const endTime = await page.evaluate(() => performance.now());

    const duration = endTime - startTime;
    console.log(`⚡ Brand Swatch Click Duration: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000);
  });

  test('should stress-test rapid canvas tool toggles without frame drops', async ({ page }) => {
    const rulerBtn = page.locator('button', { hasText: /Precision Ruler/i }).first();
    await expect(rulerBtn).toBeVisible({ timeout: 10000 });

    const startTime = await page.evaluate(() => performance.now());

    for (let i = 0; i < 5; i++) {
      await rulerBtn.click({ force: true });
    }

    const endTime = await page.evaluate(() => performance.now());
    const avgToggleTime = (endTime - startTime) / 5;

    console.log(`⚡ Average Tool Toggle Action Time: ${avgToggleTime.toFixed(2)}ms`);
    expect(avgToggleTime).toBeLessThan(500);
  });
});
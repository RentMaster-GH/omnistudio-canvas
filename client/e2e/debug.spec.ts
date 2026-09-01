import { test } from '@playwright/test';

test('🔍 Debug Page Content & Buttons', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const pageTitle = await page.title();
  const buttons = await page.locator('button, a').allInnerTexts();
  const bodyText = await page.locator('body').innerText();

  console.log('\n================ PAGE DEBUG OUTPUT ================');
  console.log('📄 Page Title:', pageTitle);
  console.log('🔘 Buttons/Links Found on Landing Page:\n', buttons);
  console.log('===================================================\n');
});
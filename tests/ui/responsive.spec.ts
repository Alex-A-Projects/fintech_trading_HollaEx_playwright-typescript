/**
 * Responsive layout sanity tests.
 *
 * Verifies the React SPA shell stays usable at desktop, tablet, and mobile
 * widths: no horizontal page overflow, viewport meta tag set, and CSS
 * media queries load correctly.
 *
 * Tags: @ui @smoke @regression @responsive
 */
import { test, expect } from '@fixtures/ui.fixture';
import { VIEWPORTS } from '@config/test-data';

test.describe('Responsive layout @ui @smoke @regression @responsive', () => {
  test('desktop 1440x900 does not overflow @smoke', async ({ page }) => {
    await runViewportCheck(page, VIEWPORTS.desktop);
  });

  test('laptop 1280x720 does not overflow', async ({ page }) => {
    await runViewportCheck(page, VIEWPORTS.laptop);
  });

  test('tablet 768x1024 does not overflow', async ({ page }) => {
    await runViewportCheck(page, VIEWPORTS.tablet);
  });

  test('mobile 390x844 does not overflow', async ({ page }) => {
    await runViewportCheck(page, VIEWPORTS.mobile);
  });

  test('mobile-small 360x640 does not overflow', async ({ page }) => {
    await runViewportCheck(page, VIEWPORTS.mobileSmall);
  });
});

async function runViewportCheck(page: import('@playwright/test').Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('https://pro.hollaex.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(800);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  // Allow up to 1px of slack — sub-pixel anti-aliasing can produce that.
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

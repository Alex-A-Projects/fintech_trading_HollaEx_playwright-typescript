/**
 * UI test fixtures. Reusable across the UI projects.
 */
import { test as base, BrowserContext, Page } from '@playwright/test';
import { PublicPage } from '@pages/index';
import { VIEWPORTS } from '@config/test-data';

export type UiFixtures = {
  context: BrowserContext;
  page: Page;
  publicPage: PublicPage;
  viewport: typeof VIEWPORTS.desktop;
};

export const test = base.extend<UiFixtures>({
  viewport: VIEWPORTS.desktop,
  // Tests use `page` to drive UI; publicPage exposes assertion-free helpers.
  publicPage: async ({ page }, use) => {
    await use(new PublicPage(page));
  },
});

export { expect } from '@playwright/test';

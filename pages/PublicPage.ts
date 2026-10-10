/**
 * Public root page — the only reliably-navigable URL on the HollaEx Pro UI
 * (verified 2026-10-09). Routes like /markets, /login, /trade/{symbol} are
 * 404 from the production server because the SPA fallback isn't configured.
 */
import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '@config/environments';

export class PublicPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto(env.publicBaseUrl, { waitUntil: 'domcontentloaded' });
  }

  get root(): Locator {
    return this.page.locator('#root');
  }

  get booting(): Locator {
    return this.page.locator('.app-booting');
  }

  get noScript(): Locator {
    return this.page.locator('noscript');
  }

  /**
   * Whether the page is currently in the SPA loading state (booting div
   * visible) or has rendered the main app.
   */
  async isBooting(): Promise<boolean> {
    return this.booting.isVisible().catch(() => false);
  }

  /**
   * Wait for the React shell to render past the booting splash. We don't
   * rely on networkidle because of infinite WebSocket streams.
   */
  async waitForAppShell(): Promise<void> {
    await this.page.waitForSelector('#root', { state: 'attached' });
    // Give the SPA some time to mount. A real flow would wait for an
    // application-specific marker; here we keep it short and non-flaky.
    await this.page.waitForTimeout(1000);
  }
}

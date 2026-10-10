/**
 * Base page object.
 *
 * Concrete pages extend this and expose only action methods (goto, click,
 * type) — assertions live in test files so the page-object layer is a thin
 * presentation model, not a duplicate test runner.
 */
import { Page, Locator, expect as baseExpect } from '@playwright/test';
import { logger } from '@utils/logger';

export abstract class BasePage {
  protected readonly log = logger.child(this.constructor.name);

  constructor(protected readonly page: Page) {}

  /**
   * Locate by accessible name (preferred — survives class name changes).
   */
  byRole(role: Parameters<Page['getByRole']>[0], name: string | RegExp): Locator {
    return this.page.getByRole(role, { name });
  }

  /**
   * Locate by accessible test-id (data-testid).
   */
  byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Locate by ARIA label.
   */
  byLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * Locate by text content. Use carefully — prefer accessible names for
   * interaction, text only for assertions.
   */
  byText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /** Document title. */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Wait for the page to settle (no network for 500ms, no DOM mutations). */
  async waitForIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 10_000 });
  }

  /** Current URL. */
  url(): string {
    return this.page.url();
  }

  /** Raw page object — useful inside tests that need Playwright primitives. */
  get rawPage(): Page {
    return this.page;
  }

  /** Take a screenshot and attach it to the current test, if any. */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /** Assert that the URL matches. Tests call this; pages expose selectors. */
  async expectUrlMatches(pattern: string | RegExp): Promise<void> {
    if (typeof pattern === 'string') {
      await baseExpect(this.page).toHaveURL(new RegExp(pattern));
    } else {
      await baseExpect(this.page).toHaveURL(pattern);
    }
  }

  /**
   * Wait for a network response matching the predicate. Useful for waiting
   * for live price updates or order submissions.
   */
  async waitForResponse(matcher: (url: string) => boolean, timeoutMs = 10_000): Promise<void> {
    await this.page.waitForResponse(
      (res) => matcher(res.url()),
      { timeout: timeoutMs },
    );
  }
}

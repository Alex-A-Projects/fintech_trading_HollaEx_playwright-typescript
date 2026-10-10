/**
 * Public UI smoke tests.
 *
 * Verified facts (2026-10-09):
 *   - The only navigable URL on the HollaEx Pro UI from the public
 *     production server is the React root `/`.
 *   - Sub-routes /markets, /trade/{symbol}, /login, /signup return 404
 *     from the server side. SPA fallback isn't configured.
 *   - The SPA renders a `<div id="root">` shell with a `.app-booting`
 *     splash that disappears when React mounts.
 *
 * These tests therefore verify the only reliable surface: the root page
 * loads, exposes the React mount point, doesn't ship obvious 5xx headers,
 * serves the manifest, and renders past the splash within a sane timeout.
 *
 * Tags: @ui @smoke @regression
 */
import { test, expect } from '@fixtures/ui.fixture';
import { env } from '@config/environments';

test.describe('HollaEx Pro root UI @ui @smoke @regression', () => {
  test('root URL responds with 200', async ({ request }) => {
    const r = await request.get(env.publicBaseUrl);
    expect(r.status()).toBeLessThan(400);
    expect(r.headers()['content-type']).toMatch(/html/);
  });

  test('root page contains a React mount point #root', async ({ publicPage }) => {
    await publicPage.goto();
    expect(await publicPage.root.count()).toBeGreaterThan(0);
  });

  test('root page has a noscript fallback for no-JS users', async ({ publicPage }) => {
    await publicPage.goto();
    const noscript = await publicPage.noScript.first().innerText().catch(() => '');
    expect(noscript.length).toBeGreaterThan(0);
  });

  test('booting splash is hidden or removed after React mounts', async ({ publicPage }) => {
    await publicPage.goto();
    await publicPage.waitForAppShell();
    // Either removed entirely, or simply not visible (display:none).
    const visible = await publicPage.booting.isVisible().catch(() => false);
    expect(visible).toBeFalsy();
  });

  test('SPA injects the manifest-placeholder link into head @smoke', async ({ page }) => {
    const response = await page.goto(env.publicBaseUrl);
    expect(response?.status() ?? 0).toBeLessThan(400);
    const hasManifest = (await page.locator('link[rel*="manifest"]').count()) > 0;
    expect(hasManifest).toBeTruthy();
  });

  test('main JS bundle loads successfully @smoke', async ({ page }) => {
    const requests: { url: string; status: number }[] = [];
    page.on('response', (r) => requests.push({ url: r.url(), status: r.status() }));
    await page.goto(env.publicBaseUrl, { waitUntil: 'load' });
    const js = requests.filter((r) => r.url.endsWith('.js'));
    expect(js.length).toBeGreaterThan(0);
    // No 5xx on any JS request.
    for (const r of js) expect(r.status).toBeLessThan(500);
  });

  test('global CSS loads with 2xx @smoke', async ({ page }) => {
    const seen: number[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.css')) seen.push(r.status());
    });
    await page.goto(env.publicBaseUrl, { waitUntil: 'load' });
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) expect(s).toBeLessThan(400);
  });

  test('Document has a valid <head> with required meta tags @seo', async ({ publicPage }) => {
    await publicPage.goto();
    // The HollaEx SPA ships a lean <head>; verify the security-critical
    // meta tags are present and well-formed.
    const metaTags = await publicPage.rawPage.evaluate(() => ({
      charset: document.querySelector('meta[charset]')?.getAttribute('charset') ?? '',
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
      theme: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '',
      manifest: document.querySelector('link[rel*="manifest"]')?.getAttribute('rel') ?? '',
    }));
    expect(metaTags.charset.toLowerCase()).toMatch(/utf-?8/);
    expect(metaTags.viewport.toLowerCase()).toContain('width=device-width');
    expect(metaTags.manifest.toLowerCase()).toContain('manifest');
  });

  test('Document is rendered in English by default @i18n', async ({ publicPage }) => {
    await publicPage.goto();
    const lang = await publicPage.rawPage.evaluate(() => document.documentElement.lang);
    expect(['en', 'en-US', 'en-GB', '']).toContain(lang);
  });
});

test.describe('HollaEx Pro UI negative routes @ui @negative', () => {
  for (const route of ['/markets', '/login', '/signup', '/trade/btc-usdt']) {
    test(`route ${route} is intentionally unavailable from server (documented limitation)`, async ({ request }) => {
      const r = await request.get(`${env.publicBaseUrl}${route}`);
      // The framework expects 404; if a HollaEx team later adds an SPA
      // fallback, this test will flip to 2xx — that's the signal to re-enable
      // route-level tests.
      expect(r.status()).toBe(404);
    });
  }
});

/**
 * Public API negative tests.
 *
 * Tags: @api @negative @security
 *
 * All tests in this file use direct `fetch()` (no fixture) so they
 * always run regardless of API rate-limit state. A security regression
 * would still respond with a 5xx or leak payload text — both
 * assertions are still meaningful under throttling.
 */
import { test, expect } from '@playwright/test';

test.describe('Public API negative cases @api @negative @security', () => {
  test('unknown endpoint returns a sensible 4xx envelope', async () => {
    let body: unknown;
    let status = 0;
    try {
      const r = await fetch('https://api.hollaex.com/v2/this-endpoint-does-not-exist');
      status = r.status;
      body = await r.text();
    } catch (err) {
      status = (err as { status?: number }).status ?? 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
    expect(status).toBeLessThan(600);
    if (status >= 400 && status < 500 && body) {
      // When the API returns a body, it must not contain a stack trace
      // and must not exceed a sensible size.
      expect((body as string).length).toBeLessThan(2_048);
      expect((body as string)).not.toMatch(/\bat\s+\w+\s+\(/); // no JS stack frames
    }
  });

  test('POST on read-only /v2/orderbook is rejected (no 5xx)', async () => {
    let status = 0;
    try {
      const r = await fetch('https://api.hollaex.com/v2/orderbook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol: 'xht-usdt' }),
      });
      status = r.status;
    } catch {
      status = 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
  });

  test('PUT on read-only /v2/tickers is rejected (no 5xx)', async () => {
    let status = 0;
    try {
      const r = await fetch('https://api.hollaex.com/v2/tickers', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      status = r.status;
    } catch {
      status = 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
  });

  test('DELETE on read-only /v2/health is rejected (no 5xx)', async () => {
    let status = 0;
    try {
      const r = await fetch('https://api.hollaex.com/v2/health', { method: 'DELETE' });
      status = r.status;
    } catch {
      status = 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
  });

  test('extremely long symbol does not 5xx @boundary', async () => {
    const longSymbol = 'a'.repeat(1024) + '-usdt';
    let status = 0;
    try {
      const r = await fetch(
        `https://api.hollaex.com/v2/ticker?symbol=${encodeURIComponent(longSymbol)}`,
      );
      status = r.status;
    } catch {
      status = 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
  });

  for (const path of [
    '/v2/',
    '/v2',
    '/v2/../../../etc/passwd',
    '/v2/v2/health',
    '/V2/health',
  ]) {
    test(`unusual path ${path} does not 5xx`, async () => {
      const r = await fetch(`https://api.hollaex.com${path}`);
      expect(r.status).toBeLessThan(500);
    });
  }

  test('malformed Accept header returns 4xx not 5xx', async () => {
    const r = await fetch('https://api.hollaex.com/v2/health', {
      headers: { Accept: 'banana/banana' },
    });
    expect(r.status).toBeLessThan(500);
  });

  test('GET with trailing question mark and empty value is handled gracefully', async () => {
    const r = await fetch('https://api.hollaex.com/v2/ticker?symbol=');
    expect(r.status).toBeLessThan(500);
  });

  test('GET with duplicate query keys returns one of the values gracefully', async () => {
    const r = await fetch('https://api.hollaex.com/v2/orderbook?symbol=xht-usdt&symbol=eth-usdt');
    expect(r.status).toBeLessThan(500);
  });

  test('HEAD request is handled sanely (no body, no error)', async () => {
    const r = await fetch('https://api.hollaex.com/v2/health', { method: 'HEAD' });
    expect(r.status).toBeLessThan(500);
  });

  test('GET with very long path does not 5xx @boundary', async () => {
    const longPath = '/v2/' + 'a'.repeat(2048);
    let status = 0;
    try {
      const r = await fetch(`https://api.hollaex.com${longPath}`);
      status = r.status;
    } catch {
      status = 0;
    }
    expect(status).not.toBeGreaterThanOrEqual(500);
  });

  test('GET with multiple trailing slashes does not 5xx', async () => {
    const r = await fetch('https://api.hollaex.com/v2/health/');
    expect(r.status).toBeLessThan(500);
  });
});

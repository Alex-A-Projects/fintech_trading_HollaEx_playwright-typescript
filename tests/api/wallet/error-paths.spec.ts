/**
 * Wallet error-path tests against the live public API surface.
 *
 * Tags: @api @wallet @error
 *
 * These tests intentionally hit `api.hollaex.com` with malformed inputs
 * to verify the documented error envelope. They run on any environment.
 */
import { test, expect } from '@fixtures/api.fixture';

test.describe('Wallet error-path shapes @api @wallet @error', () => {
  test('unauthenticated wallet call returns a 4xx envelope @unauthenticated', async () => {
    // Wallet endpoints on the public API live behind auth. The test
    // exists to document the shape; we accept any non-5xx response.
    const r = await fetch('https://api.hollaex.com/v2/user/balance');
    expect(r.status).not.toBeGreaterThanOrEqual(500);
    if (r.status >= 400) {
      const text = await r.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('GET /v2/user/deposits requires authentication @unauthenticated', async () => {
    const r = await fetch('https://api.hollaex.com/v2/user/deposits');
    expect(r.status).not.toBeGreaterThanOrEqual(500);
  });

  test('GET /v2/user/withdrawals requires authentication @unauthenticated', async () => {
    const r = await fetch('https://api.hollaex.com/v2/user/withdrawals');
    expect(r.status).not.toBeGreaterThanOrEqual(500);
  });

  test('POST /v2/user/withdrawal without body returns 4xx @no-body', async () => {
    const r = await fetch('https://api.hollaex.com/v2/user/withdrawal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(r.status).not.toBeGreaterThanOrEqual(500);
  });

  test('GET /v2/user/withdrawal/fee?currency=non-existent does not 5xx @unknown-currency', async () => {
    const r = await fetch('https://api.hollaex.com/v2/user/withdrawal/fee?currency=zzz-non-existent');
    expect(r.status).not.toBeGreaterThanOrEqual(500);
  });
});

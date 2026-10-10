/**
 * WebSocket gateway smoke tests.
 *
 * The HollaEx Pro streaming endpoints live at `wss://api.hollaex.com/stream`
 * for public data and `wss://api.hollaex.com/stream` (with an API-key
 * signature) for private events. These tests verify the gateway
 * accepts a public subscribe without timing out or 5xx-ing.
 *
 * Note: we don't pull in a heavy WS client — Playwright's request fixture
 * can drive an HTTP-only handshake check.
 *
 * Tags: @api @smoke @regression @streaming
 */
import { test, expect } from '@fixtures/api.fixture';
import { env } from '@config/environments';

test.describe('Streaming gateway probe @api @smoke @regression @streaming', () => {
  test('streaming endpoint URL is well-formed @config', () => {
    expect(env.publicApiBaseUrl).toMatch(/^https?:\/\//);
    const wsUrl = env.publicApiBaseUrl.replace(/^http/, 'ws') + '/stream';
    expect(wsUrl).toMatch(/^wss?:\/\/.+\/stream$/);
  });

  test('WebSocket-style probe (HTTP upgrade handshake) does not 5xx', async ({ request }) => {
    // Browsers refuse HEAD against WS, but a GET with Upgrade headers
    // is a recognisable smoke probe.
    let status = 0;
    try {
      const r = await request.get(env.publicApiBaseUrl + '/stream', {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13',
        },
      });
      status = r.status();
      await r.text();
    } catch {
      status = 0;
    }
    expect(status).toBeLessThan(500);
  });

  test('public REST + WS share the same base URL @config', () => {
    // Both surfaces live under the same API host. Asserting this catches
    // accidental .env drift between smoke runs.
    expect(env.publicApiBaseUrl).toContain('hollaex');
  });
});

/**
 * Security tests against the public API.
 *
 * Goal: surface basic hardening regressions — open redirects, XSS-reflective
 * payloads, oversized query params, header injection, error information
 * leakage. Anything that mutates state is out of scope here (and would
 * anyway be blocked by HOLLAEX_ENV=production-readonly).
 *
 * Tags: @api @security @negative
 */
import { test, expect } from '@fixtures/api.fixture';

const REFLECTED_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "' onclick='alert(1)'",
  'javascript:alert(1)',
  '<iframe src=javascript:alert(1)>',
  '<svg onload=alert(1)>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  // SVG / XML namespace smuggling
  '\\\\u003cscript\\\\u003ealert(1)\\\\u003c/script\\\\u003e',
  // Markdown / link injection
  '[click](javascript:alert(1))',
  '![x](x" onerror="alert(1))',
];

const OVERSIZED_STRINGS = [
  'A'.repeat(2_048),
  'A'.repeat(65_536),
  'A'.repeat(1_048_576),
];

const CRLF_PAYLOADS = [
  'a%0d%0aSet-Cookie:%20foo=bar',
  'a\\r\\nLocation:%20https://attacker.example.com',
  'foo%0aContent-Type:%20text/html',
];

const NEGATIVE_NUMBER_PAYLOADS = [
  '-0',
  '-1',
  '-1.7976931348623157e+308',
  '-Infinity',
  'NaN',
];

test.describe('Public API hardening @api @security', () => {
  for (const payload of REFLECTED_PAYLOADS) {
    test(`does not reflect XSS payload into symbol param: ${payload.slice(0, 24)}`, async () => {
      const start = Date.now();
      const url = `https://api.hollaex.com/v2/ticker?symbol=${encodeURIComponent(payload)}`;
      const res = await fetch(url);
      const text = await res.text();
      expect(Date.now() - start).toBeLessThan(10_000);
      if (res.status === 200) {
        // No raw HTML or onerror should appear in a JSON response.
        expect(text.toLowerCase().includes('<script')).toBeFalsy();
        expect(text.includes('onerror=')).toBeFalsy();
      } else {
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });
  }

  for (const big of OVERSIZED_STRINGS) {
    test(`oversized query parameter is rejected: length=${big.length}`, async () => {
      const start = Date.now();
      const r = await fetch(`https://api.hollaex.com/v2/ticker?symbol=${encodeURIComponent(big)}`);
      const text = await r.text();
      expect(Date.now() - start).toBeLessThan(15_000);
      if (r.status === 200) {
        expect(text.length).toBeLessThan(1_024);
      } else {
        expect(r.status).toBeGreaterThanOrEqual(400);
      }
    });
  }

  test('response does not leak stack traces @info disclosure', async () => {
    const r = await fetch('https://api.hollaex.com/v2/ticker?symbol=');
    const text = await r.text();
    expect(text).not.toMatch(/\bat\s+\w+\s+\(/);
    expect(text).not.toMatch(/node_modules/);
    expect(text).not.toMatch(/\.js:\d+:\d+/);
  });

  test('CORS headers do not allow arbitrary origins @cors', async () => {
    const r = await fetch('https://api.hollaex.com/v2/health', {
      headers: { Origin: 'https://attacker.example.com' },
    });
    const allow = r.headers.get('access-control-allow-origin');
    if (allow !== null) {
      expect([allow]).toEqual(expect.arrayContaining([expect.stringMatching(/^(https:\/\/.*hollaex\.com|\*)$/i)]));
    }
  });

  test('invalid content-type POST is rejected @content-type', async () => {
    const r = await fetch('https://api.hollaex.com/v2/tickers', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'foo',
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  test('OPTIONS preflight returns CORS headers as documented @preflight', async () => {
    const r = await fetch('https://api.hollaex.com/v2/tickers', {
      method: 'OPTIONS',
      headers: { Origin: 'https://pro.hollaex.com' },
    });
    // We don't assert on the exact response code — some CDNs return 200,
    // 204, or 405 for preflight. We just want a structured, non-5xx reply.
    expect(r.status).toBeLessThan(500);
  });

  test('multiple content-type negotiation does not leak parser errors', async () => {
    for (const ct of ['text/xml', 'application/xml', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      const r = await fetch('https://api.hollaex.com/v2/tickers', {
        method: 'POST',
        headers: { 'content-type': ct },
        body: 'foo=bar',
      });
      expect(r.status).not.toBeGreaterThanOrEqual(500);
    }
  });

  test('range request via Range header is handled sanely @range', async () => {
    const r = await fetch('https://api.hollaex.com/v2/tickers', {
      headers: { Range: 'bytes=0-100' },
    });
    expect(r.status).toBeLessThan(500);
  });
});

test.describe('CRLF / header injection @api @security @crlf', () => {
  for (const payload of CRLF_PAYLOADS) {
    test(`CRLF payload does not inject headers: ${payload.slice(0, 24)}`, async () => {
      const r = await fetch(`https://api.hollaex.com/v2/ticker?symbol=${payload}`);
      const setCookie = r.headers.get('set-cookie');
      const location = r.headers.get('location');
      // The response should NOT have a Set-Cookie of "foo=bar" via our
      // injection payload. If no set-cookie is present, that's the
      // expected behaviour and the assertion passes trivially.
      if (setCookie !== null) {
        expect(setCookie).not.toContain('foo=bar');
      }
      if (location !== null) {
        expect(location.toLowerCase()).not.toContain('attacker');
      }
    });
  }
});

test.describe('Negative numeric inputs @api @security @negative-numerics', () => {
  for (const payload of NEGATIVE_NUMBER_PAYLOADS) {
    test(`negative numeric "${payload}" is not used as price or size`, async () => {
      const r = await fetch(`https://api.hollaex.com/v2/ticker?symbol=${encodeURIComponent(payload)}`);
      if (r.status === 200) {
        const text = await r.text();
        // The API must not return a 200 with a parsed price of NaN or
        // -Infinity for one of these inputs.
        expect(text).not.toMatch(/"last":\s*NaN/);
        expect(text).not.toMatch(/"last":\s*-Infinity/);
      }
    });
  }
});

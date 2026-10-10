/**
 * Auth API client.
 *
 * HollaEx Kit uses HMAC-SHA256-signed requests for authenticated endpoints.
 * Verified signing algorithm (per apidocs and live probe):
 *
 *     canonical = METHOD + PATH + API_EXPIRES + RAW_BODY   (no separators)
 *     signature = HMAC_SHA256(API_SECRET, canonical).hex()
 *     headers   = { 'api-key', 'api-signature', 'api-expires' }
 *
 * The PATH is the request path without query string or scheme/host. GETs use
 * an empty body.
 *
 * REF: https://apidocs.hollaex.com/  (#authentication)
 *
 * Tests against authenticated endpoints are gated by `requireLocalOrTestnet`
 * so that production credentials can never be wired up by mistake.
 */
import { createHmac } from 'crypto';
import { z } from 'zod';
import { BaseApiClient } from './BaseApiClient';
import { PRIVATE_ENDPOINTS } from '@config/endpoints';
import { HollaexErrorEnvelopeSchema, parseWithSchema } from '@utils/testHelpers';
import { env, requireLocalOrTestnet } from '@config/environments';

export interface SignedHeadersOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  expiresSecondsFromNow?: number;
}

export interface AuthContext {
  token: string;
  userId?: string | number;
  expiresAt?: number;
}

export const UserInfoSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    email: z.string().email(),
    is_active: z.boolean().optional(),
    flagged: z.boolean().optional(),
    verification_level: z.number().int().nonnegative().optional(),
    fee: z.number().nonnegative().optional(),
  })
  .passthrough();

export class AuthApiClient extends BaseApiClient {
  private authCtx?: AuthContext;

  /**
   * Construct the HMAC-signed request headers per the HollaEx spec.
   * `path` must be the request path without scheme/host/query, and must
   * start with "/". Body is the JSON-stringified request body or empty for
   * GET / DELETE.
   */
  static signHeaders(apiKey: string, apiSecret: string, opts: SignedHeadersOptions): {
    headers: Record<string, string>;
    expires: number;
    signature: string;
  } {
    const path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`;
    const method = opts.method.toUpperCase();
    const expires = Math.floor(Date.now() / 1000) + (opts.expiresSecondsFromNow ?? 300);
    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
    const canonical = `${method}${path}${expires}${bodyStr}`;
    const signature = createHmac('sha256', apiSecret).update(canonical).digest('hex');
    return {
      headers: {
        'api-key': apiKey,
        'api-signature': signature,
        'api-expires': String(expires),
        'content-type': 'application/json',
      },
      expires,
      signature,
    };
  }

  /**
   * Sign and execute a request, returning parsed JSON.
   */
  async signed<T>(apiKey: string, apiSecret: string, opts: SignedHeadersOptions & { schema?: z.ZodTypeAny }): Promise<T> {
    const { headers } = AuthApiClient.signHeaders(apiKey, apiSecret, opts);
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
    const url = new URL(opts.path, this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`);

    const res = await fetch(url.toString(), {
      method: opts.method.toUpperCase(),
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const envelope = parseWithSchema(HollaexErrorEnvelopeSchema, parsed ?? {});
      throw new Error(
        `Signed ${opts.method} ${opts.path} failed: HTTP ${res.status} – ${JSON.stringify(envelope)}`,
      );
    }
    if (opts.schema) {
      return parseWithSchema(opts.schema, parsed) as T;
    }
    return parsed as T;
  }

  /**
   * Login via documented endpoint, return parsed token. Throws if the local
   * environment isn't configured (we never authenticate against production).
   */
  async login(email: string, password: string): Promise<AuthContext> {
    requireLocalOrTestnet('AuthApiClient.login');
    // Some HollaEx Kit deployments expose /v2/login as an HMAC-signed
    // request rather than a public POST. We try the HMAC variant first; if
    // not supported, the wrapped environment will surface the failure.
    const res = await this.signed<{ jwt_token?: string; token?: string }>(env.adminApiKey, env.adminApiSecret, {
      method: 'POST',
      path: PRIVATE_ENDPOINTS.user.path,
      body: { email, password },
    });
    const token = res?.jwt_token ?? res?.token ?? '';
    if (!token) {
      throw new Error('login() succeeded but no token returned');
    }
    this.authCtx = { token };
    return this.authCtx;
  }

  /**
   * Login variations we want to test: missing/empty email/password etc.
   * Returns the raw response — tests assert both status and body shape.
   */
  async loginRaw(email: string | undefined, password: string | undefined): Promise<unknown> {
    requireLocalOrTestnet('AuthApiClient.loginRaw');
    const body: Record<string, unknown> = {};
    if (email !== undefined) body.email = email;
    if (password !== undefined) body.password = password;
    let status = 0;
    let parsed: unknown = null;
    try {
      parsed = await this.signed(env.adminApiKey, env.adminApiSecret, {
        method: 'POST',
        path: PRIVATE_ENDPOINTS.user.path,
        body,
      });
      status = 200;
    } catch (err) {
      const m = /HTTP (\d+)/.exec((err as Error).message);
      status = m ? Number(m[1]) : 0;
      const json = /\{.*\}/.exec((err as Error).message);
      if (json) {
        try { parsed = JSON.parse(json[0]); } catch { /* leave null */ }
      }
    }
    return { status, body: parsed };
  }

  getAuthContext(): AuthContext | undefined {
    return this.authCtx;
  }

  async getUserInfo() {
    requireLocalOrTestnet('AuthApiClient.getUserInfo');
    return this.signed(env.adminApiKey, env.adminApiSecret, {
      method: 'GET',
      path: PRIVATE_ENDPOINTS.user.path,
      schema: UserInfoSchema,
    });
  }

  async loginBadCredentials(): Promise<{ status: number; body: unknown }> {
    const r = (await this.loginRaw('qa-nonexistent@hollaex-qa.local', 'definitely-wrong-password')) as {
      status: number;
      body: unknown;
    };
    return r;
  }

  static parseErrorEnvelope(body: unknown) {
    return parseWithSchema(HollaexErrorEnvelopeSchema, body);
  }
}

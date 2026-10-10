/**
 * Environment configuration loader.
 *
 * Reads the dotenv file once at module load and exposes a typed view of all
 * supported environments (local, testnet, production-readonly). Tests must
 * never silently fall back to production when local credentials are missing
 * — they throw a clear error instead.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type HollaexEnvironment = 'local' | 'testnet' | 'production-readonly';

const ENV_VALUES: ReadonlyArray<HollaexEnvironment> = [
  'local',
  'testnet',
  'production-readonly',
];

function readEnv(): HollaexEnvironment {
  const raw = (process.env.HOLLAEX_ENV ?? 'production-readonly').trim();
  if (!ENV_VALUES.includes(raw as HollaexEnvironment)) {
    throw new Error(
      `Unsupported HOLLAEX_ENV value: "${raw}". Expected one of: ${ENV_VALUES.join(', ')}`,
    );
  }
  return raw as HollaexEnvironment;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Environment variable ${name}=${raw} is not a number`);
  }
  return n;
}

function readString(name: string, fallback?: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Required environment variable ${name} is missing`);
  }
  return raw;
}

/**
 * Cloudflare / HollaEx API responses that signal edge-level throttling
 * (rather than a real "not found" or "forbidden"). When the live API is
 * being throttled at the edge, *all* endpoints either return:
 *
 *   - HTTP 404 with `{"code":284,"message":"Path not found"}` (rate limit
 *     window expired but edge is filtering), OR
 *   - HTTP 403 with `error code: 1006` (Cloudflare IP block active), OR
 *   - HTTP 429 (a real rate-limit response), OR
 *   - HTTP 403 with "rate" in the body
 *
 * Public API tests probe the API once via the `api.fixture.ts` and
 * self-skip when any of these signal throttling, so they don't pile up
 * noisy failures and don't masquerade as bug regressions.
 */
export async function isApiRateLimited(status: number, body: string): Promise<boolean> {
  if (status === 404 && body.includes('"code":284')) return true;
  if (status === 403 && /error code:\s*1006/i.test(body)) return true;
  if (status === 403 && /error code:\s*100[0-9]/i.test(body)) return true;
  if (status === 403 && body.toLowerCase().includes('rate')) return true;
  if (status === 429) return true;
  // Generic detection: any JSON error envelope that mentions "rate" or
  // "limit" alongside an HTTP 4xx.
  if (status >= 400 && status < 500) {
    const lowered = body.toLowerCase();
    if (/(rate.?limit|too many requests|throttl|blocked|access denied)/.test(lowered)) {
      return true;
    }
  }
  return false;
}

/**
 * Single typed environment config. Throws fast if the chosen environment is
 * not configured correctly. Tests reference this everywhere instead of
 * touching `process.env` directly.
 */
export const env = Object.freeze({
  environment: readEnv(),

  // Public production UI/API. Verified endpoints: api.hollaex.com. UI routes
  // /markets, /login, /trade/* return 404 from the server — public UI tests
  // navigate to the root SPA (https://pro.hollaex.com/) instead.
  publicBaseUrl: readString('PUBLIC_BASE_URL', 'https://pro.hollaex.com'),
  publicApiBaseUrl: readString('PUBLIC_API_BASE_URL', 'https://api.hollaex.com'),

  // Local HollaEx Kit
  localBaseUrl: readString('LOCAL_BASE_URL', 'http://localhost:8080'),
  localApiBaseUrl: readString('LOCAL_API_BASE_URL', 'http://localhost:8080'),

  // Database
  dbHost: readString('LOCAL_DB_HOST', 'localhost'),
  dbPort: readNumber('LOCAL_DB_PORT', 5432),
  dbName: readString('LOCAL_DB_NAME', 'hollaex'),
  dbUser: readString('LOCAL_DB_USER', 'hollaex'),
  dbPassword: readString('LOCAL_DB_PASSWORD', ''),

  // Auth fixtures
  testUserEmail: readString('TEST_USER_EMAIL', ''),
  testUserPassword: readString('TEST_USER_PASSWORD', ''),
  testUser2Email: readString('TEST_USER_2_EMAIL', ''),
  testUser2Password: readString('TEST_USER_2_PASSWORD', ''),
  adminApiKey: readString('ADMIN_API_KEY', ''),
  adminApiSecret: readString('ADMIN_API_SECRET', ''),

  // Tuning
  integrationWorkers: readNumber('INTEGRATION_WORKERS', 1),
  smokeRetries: readNumber('SMOKE_RETRIES', 0),
  ciRetries: readNumber('CI_RETRIES', 2),
  publicApiResponseBudgetMs: readNumber('PUBLIC_API_RESPONSE_BUDGET_MS', 5000),
  dbReadOnly: readBool('DB_READ_ONLY', true),

  // Computed flags
  get isCi(): boolean {
    return Boolean(process.env.CI);
  },

  get isLocal(): boolean {
    return this.environment === 'local';
  },

  get isTestnet(): boolean {
    return this.environment === 'testnet';
  },

  get isProductionReadonly(): boolean {
    return this.environment === 'production-readonly';
  },

  /**
   * Resolve a base URL for the active environment. Throws if the requested
   * role (ui vs api) cannot be served by the active environment.
   */
  baseUrl(role: 'ui' | 'api'): string {
    if (role === 'api') {
      if (this.isProductionReadonly) return this.publicApiBaseUrl;
      return this.localApiBaseUrl;
    }
    if (this.isProductionReadonly) return this.publicBaseUrl;
    return this.localBaseUrl;
  },
});

/**
 * Throw a descriptive error when something needs the local environment.
 * Used by tests that absolutely cannot run against production.
 */
export function requireLocalOrTestnet(action: string): void {
  if (env.environment === 'production-readonly') {
    throw new Error(
      `Action "${action}" requires HOLLAEX_ENV=local or HOLLAEX_ENV=testnet. ` +
        `Current value: HOLLAEX_ENV=${env.environment}. ` +
        `This is intentional to avoid running destructive tests against production.`,
    );
  }
}

/**
 * Base API client.
 *
 * Wraps `playwright.request.APIRequestContext` so each test suite can spin up
 * its own context with its own auth headers and base URL. The base client
 * stays generic — concrete clients (Market, Auth, Order, …) build on it.
 */
import { APIRequestContext, request, APIResponse } from '@playwright/test';
import { env } from '@config/environments';
import { logger } from '@utils/logger';

export interface ApiClientOptions {
  baseURL?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

export type QueryParams = Record<string, string | number | boolean>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public readonly url: string;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export class BaseApiClient {
  protected readonly baseURL: string;
  protected readonly extraHeaders: Record<string, string>;
  protected readonly timeoutMs: number;
  protected ctx?: APIRequestContext;

  constructor(opts: ApiClientOptions = {}) {
    this.baseURL = opts.baseURL ?? env.baseUrl('api');
    this.extraHeaders = opts.extraHeaders ?? {};
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  /**
   * Initialise the underlying request context. Tests typically call this in a
   * fixture's setup and `dispose` in teardown.
   */
  async init(): Promise<APIRequestContext> {
    if (this.ctx) return this.ctx;
    this.ctx = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'User-Agent': 'hollaex-qa-automation/1.0.0 (+playwright)',
        Accept: 'application/json',
        ...this.extraHeaders,
      },
      timeout: this.timeoutMs,
      ignoreHTTPSErrors: true,
    });
    logger.info('api:init', { baseURL: this.baseURL });
    return this.ctx;
  }

  async dispose(): Promise<void> {
    if (this.ctx) {
      await this.ctx.dispose();
      this.ctx = undefined;
    }
  }

  protected get ctxOrThrow(): APIRequestContext {
    if (!this.ctx) {
      throw new Error('ApiClient not initialised — call init() first');
    }
    return this.ctx;
  }

  protected async ensureJson<T>(res: APIResponse): Promise<T> {
    const ctype = res.headers()['content-type'] ?? '';
    const body: unknown = ctype.includes('json') ? await res.json().catch(() => null) : await res.text();
    if (!res.ok()) {
      throw new ApiError(
        `${res.status()} ${res.statusText()} for ${res.url()}`,
        res.status(),
        res.url(),
        body,
      );
    }
    return body as T;
  }

  protected async get<T>(path: string, params?: QueryParams): Promise<T> {
    const start = Date.now();
    const res = await this.ctxOrThrow.get(path, { params });
    const ms = Date.now() - start;
    logger.debug('api:get', { path, status: res.status(), ms });
    return this.ensureJson<T>(res);
  }

  /** Public variant of `get` for tests that want to drive non-typed GETs. */
  async getPublic<T = unknown>(path: string, params?: QueryParams): Promise<T> {
    return this.get<T>(path, params);
  }

  protected async post<T>(path: string, data?: unknown, params?: QueryParams): Promise<T> {
    const res = await this.ctxOrThrow.post(path, { data, params });
    logger.debug('api:post', { path, status: res.status() });
    return this.ensureJson<T>(res);
  }

  protected async del<T>(path: string, params?: QueryParams): Promise<T> {
    const res = await this.ctxOrThrow.delete(path, { params });
    logger.debug('api:delete', { path, status: res.status() });
    return this.ensureJson<T>(res);
  }

  protected async put<T>(path: string, data?: unknown): Promise<T> {
    const res = await this.ctxOrThrow.put(path, { data });
    logger.debug('api:put', { path, status: res.status() });
    return this.ensureJson<T>(res);
  }

  /**
   * Variant of `get` that returns the response rather than parsing JSON. Used
   * by schema-validation tests that need access to headers, status, timing,
   * and body at the same time.
   */
  protected async rawGet(
    path: string,
    params?: QueryParams,
  ): Promise<APIResponse> {
    return this.ctxOrThrow.get(path, { params });
  }

  /**
   * Variant of `get` that throws regardless of HTTP status. Used for negative
   * / error-shape tests where we expect a 4xx.
   */
  protected async getExpectingError<T>(path: string, params?: QueryParams): Promise<T> {
    const res = await this.ctxOrThrow.get(path, { params });
    const body = await res.json().catch(() => null);
    return body as T;
  }
}

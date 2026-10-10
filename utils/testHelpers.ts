/**
 * Common helpers used by tests: waiting, polling, retries, safe parsing,
 * and `expect`-style schema assertions built on Zod.
 */
import { z } from 'zod';
import { logger } from './logger';

export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 250;
  const start = Date.now();
  let last: T;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      last = await fn();
      if (predicate(last)) return last;
    } catch (err) {
      logger.debug('pollUntil:error', { error: (err as Error).message });
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `pollUntil timed out after ${timeoutMs}ms${
          options.description ? ` waiting for: ${options.description}` : ''
        }`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function safeJsonParse<T = unknown>(input: string): Promise<T | undefined> {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

/**
 * Return the conventional HollaEx error envelope shape. The Kit uses either
 * `{ message, code }` or `{ errors: [{ msg, path }] }` depending on the
 * endpoint, so we accept any of these.
 */
export const HollaexErrorEnvelopeSchema = z
  .object({
    message: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional(),
    errors: z
      .array(
        z.object({
          msg: z.string(),
          path: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export type HollaexErrorEnvelope = z.infer<typeof HollaexErrorEnvelopeSchema>;

/**
 * Asserts that a fetched body matches a Zod schema, returning the parsed
 * value. Throws with a helpful message including the schema path that failed.
 */
export function parseWithSchema<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Schema validation failed at ${issue.path.join('.')}: ${issue.message}. ` +
        `Input: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }
  return result.data;
}

/**
 * Convenience: run `fn` repeatedly (with the same async args) until it
 * resolves successfully or the timeout is hit. Useful for waiting on
 * eventual consistency in DB reads after an API mutation.
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; description?: string } = {},
): Promise<T> {
  const attempts = options.attempts ?? 5;
  const delayMs = options.delayMs ?? 500;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(
    `retryUntil exhausted ${attempts} attempts${options.description ? ` for ${options.description}` : ''}: ${(lastErr as Error)?.message}`,
  );
}

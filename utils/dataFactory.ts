/**
 * Deterministic test data factory. Use it from fixtures so individual tests
 * generate their own isolated data and don't depend on shared state.
 *
 * Why deterministic? We seed values from a per-test identifier (passed in
 * via `seed`) so failures reproduce.
 */
import { randomBytes } from 'crypto';

export interface FactoryOptions {
  seed?: string;
  /** Override the source of randomness. Defaults to crypto.randomBytes. */
  rng?: () => number;
}

function makeId(length = 12, rng: () => number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(rng() * chars.length)];
  }
  return out;
}

function defaultRng(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff;
}

function seededRng(seed: string): () => number {
  let s = seed.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  if (s === 0) s = 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function rngFor(opts?: FactoryOptions): () => number {
  if (opts?.rng) return opts.rng;
  if (opts?.seed) return seededRng(opts.seed);
  return defaultRng;
}

export const dataFactory = Object.freeze({
  /** Lowercase alphanumerics, useful for unique emails. */
  uniqueId(opts?: FactoryOptions): string {
    return makeId(12, rngFor(opts));
  },

  /** Generates a unique email like `qa-abc123...@hollaex-qa.local`. */
  uniqueEmail(opts?: FactoryOptions): string {
    return `qa-${makeId(12, rngFor(opts))}@hollaex-qa.local`;
  },

  /** Generates a password that satisfies HollaEx documented complexity rules. */
  validPassword(opts?: FactoryOptions): string {
    const rng = rngFor(opts);
    const id = makeId(8, rng);
    return `Qa!Test-${id}-Aa1!`;
  },

  /** Pick a value, optionally biased toward negatives. */
  pick<T>(arr: ReadonlyArray<T>, opts?: FactoryOptions): T {
    const idx = Math.floor(rngFor(opts)() * arr.length);
    return arr[idx];
  },

  /** Random float in [min, max] rounded to `decimals` places. */
  randomPrice(min: number, max: number, decimals = 2, opts?: FactoryOptions): number {
    const rng = rngFor(opts);
    const v = min + rng() * (max - min);
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
  },

  /** Random integer in [min, max]. */
  randomInt(min: number, max: number, opts?: FactoryOptions): number {
    const rng = rngFor(opts);
    return Math.floor(min + rng() * (max - min + 1));
  },

  /** Common boundary-value generator for amounts/prices. */
  boundaryValues(): number[] {
    return [0, -1, 0.00000001, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.NaN];
  },
});

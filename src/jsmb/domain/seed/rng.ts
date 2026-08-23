/**
 * Deterministic randomness. The whole prototype must produce byte-identical
 * numbers on every run, so `Math.random` is never used anywhere in the app —
 * every "random" choice comes from a mulberry32 stream seeded with `SEED`.
 */

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Returns a generator producing floats in [0, 1).
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform pick from a non-empty list. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Inclusive integer in [min, max]. */
export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability `p`. */
export function chance(rng: () => number, p: number): boolean {
  return rng() < p;
}

/** Float in [min, max). */
export function floatBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * Picks from `items` using parallel `weights`. Used for product mix and status
 * distributions, where a uniform draw would look obviously synthetic.
 */
export function weightedPick<T>(
  rng: () => number,
  items: readonly T[],
  weights: readonly number[],
): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Log-ish skewed integer in [min, max], biased hard toward `min`.
 * Real order books have many small orders and a thin tail of large ones;
 * `skew` > 1 deepens that tail.
 */
export function skewedInt(rng: () => number, min: number, max: number, skew = 1.8): number {
  const t = Math.pow(rng(), skew);
  return Math.max(min, Math.min(max, Math.round(min + t * (max - min))));
}

/** Fisher-Yates using the seeded stream; returns a new array. */
export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

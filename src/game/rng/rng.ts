/**
 * Injectable randomness (SPDD §8). `Math.random` is unusable here because the
 * host must be able to reproduce a match exactly from its action log.
 *
 * The generator is counter-based rather than state-mutating in a hidden way:
 * every value is a pure function of `(seed, cursor)`, so a snapshot is two
 * numbers and restoring one is exact.
 */

export interface RngState {
  readonly seed: number;
  readonly cursor: number;
}

export interface RNG {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], both inclusive. */
  integer(min: number, max: number): number;
  /** Uniformly picks one element; returns undefined only for an empty list. */
  pick<T>(items: readonly T[]): T | undefined;
  /** Current position, for writing back into GameState. */
  snapshot(): RngState;
}

const TWO_POW_32 = 0x1_0000_0000;

/** splitmix32 finalizer — fast, well-distributed, and exactly reproducible. */
function scramble(input: number): number {
  let value = input | 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0_aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a_2d97);
  value ^= value >>> 15;
  return value >>> 0;
}

/**
 * The seed is scrambled into a starting point before the cursor walks it by a
 * golden-ratio step. Deriving the value from `seed + cursor` directly would be
 * much worse than it looks: seed 1 at cursor 1 and seed 2 at cursor 0 would
 * collide, so two matches with different seeds would be phase-shifted copies
 * of one another rather than independent.
 */
const valueAt = (seed: number, cursor: number): number =>
  scramble((scramble(seed) + Math.imul(cursor, 0x9e37_79b9)) | 0);

export function createRng(state: RngState): RNG {
  let cursor = state.cursor;
  const { seed } = state;

  const next = (): number => {
    const value = valueAt(seed, cursor);
    cursor += 1;
    return value / TWO_POW_32;
  };

  return {
    next,
    integer(min, max) {
      if (max < min) {
        throw new RangeError(`integer(${String(min)}, ${String(max)}): empty range`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) return undefined;
      return items[this.integer(0, items.length - 1)];
    },
    snapshot: () => ({ seed, cursor }),
  };
}

export const initialRngState = (seed: number): RngState => ({ seed: seed | 0, cursor: 0 });

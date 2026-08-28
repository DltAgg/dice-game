import { describe, expect, it } from "vitest";
import { createRng, initialRngState } from "./rng.js";

describe("seeded rng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createRng(initialRngState(1234));
    const b = createRng(initialRngState(1234));

    const seqA = Array.from({ length: 20 }, () => a.integer(1, 6));
    const seqB = Array.from({ length: 20 }, () => b.integer(1, 6));

    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(initialRngState(1));
    const b = createRng(initialRngState(2));

    const seqA = Array.from({ length: 20 }, () => a.integer(1, 6));
    const seqB = Array.from({ length: 20 }, () => b.integer(1, 6));

    expect(seqA).not.toEqual(seqB);
  });

  it("does not make one seed a phase-shifted copy of another", () => {
    const sequenceFor = (seed: number, length: number): number[] => {
      const rng = createRng(initialRngState(seed));
      return Array.from({ length }, () => rng.integer(1, 6));
    };

    const reference = sequenceFor(1, 40).join("");

    for (let seed = 2; seed <= 24; seed += 1) {
      // A weak counter-based generator leaks as an offset copy of the
      // neighbouring seed's stream, which makes every match play out the same.
      expect(reference).not.toContain(sequenceFor(seed, 12).join(""));
    }
  });

  it("resumes exactly from a snapshot", () => {
    const original = createRng(initialRngState(99));
    Array.from({ length: 7 }, () => original.next());

    const resumed = createRng(original.snapshot());
    const expected = Array.from({ length: 10 }, () => original.integer(1, 6));
    const actual = Array.from({ length: 10 }, () => resumed.integer(1, 6));

    expect(actual).toEqual(expected);
  });

  it("advances the cursor once per drawn value", () => {
    const rng = createRng(initialRngState(5));
    expect(rng.snapshot().cursor).toBe(0);
    rng.next();
    rng.integer(1, 6);
    expect(rng.snapshot().cursor).toBe(2);
  });

  it("stays within the requested inclusive range", () => {
    const rng = createRng(initialRngState(7));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.integer(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen.size).toBe(6);
  });

  it("has a snapshot that survives a JSON round trip", () => {
    const rng = createRng(initialRngState(42));
    Array.from({ length: 3 }, () => rng.next());

    const revived = createRng(JSON.parse(JSON.stringify(rng.snapshot())) as ReturnType<typeof rng.snapshot>);
    expect(revived.integer(1, 6)).toBe(createRng(rng.snapshot()).integer(1, 6));
  });
});

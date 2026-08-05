import { describe, it, expect } from "vitest";
import { calculateUnionizedAmmoniaFraction, calculateUnionizedAmmoniaMgL } from "./ammoniaChemistry";

describe("calculateUnionizedAmmoniaFraction", () => {
  it("reproduces the standard ~9.25 pKa-at-25C reference point", () => {
    // pKa = 0.09018 + 2729.92/298.15 = 9.2466, not 25C's fraction directly,
    // but confirms the formula's pKa term matches the widely-cited constant
    // before testing fraction output.
    const fractionAtPKa = calculateUnionizedAmmoniaFraction(9.2466, 25);
    expect(fractionAtPKa).toBeCloseTo(0.5, 3); // by definition, pH === pKa => 50% unionized
  });

  it("reproduces Ch.7 S4's own illustrative example at pH 8 / 25C (~4.9%) within ~1 percentage point", () => {
    const fraction = calculateUnionizedAmmoniaFraction(8, 25);
    expect(fraction).toBeGreaterThan(0.04);
    expect(fraction).toBeLessThan(0.06);
  });

  it("reproduces Ch.7 S4's own illustrative example at pH 8 / 32C (~8.7%) within ~1 percentage point", () => {
    const fraction = calculateUnionizedAmmoniaFraction(8, 32);
    expect(fraction).toBeGreaterThan(0.07);
    expect(fraction).toBeLessThan(0.1);
  });

  it("increases with rising pH, holding temperature constant", () => {
    const lower = calculateUnionizedAmmoniaFraction(7, 28);
    const higher = calculateUnionizedAmmoniaFraction(9, 28);
    expect(higher).toBeGreaterThan(lower);
  });

  it("increases with rising temperature, holding pH constant", () => {
    const cooler = calculateUnionizedAmmoniaFraction(8, 20);
    const warmer = calculateUnionizedAmmoniaFraction(8, 32);
    expect(warmer).toBeGreaterThan(cooler);
  });
});

describe("calculateUnionizedAmmoniaMgL", () => {
  it("scales linearly with TAN at a fixed pH/temperature", () => {
    const low = calculateUnionizedAmmoniaMgL(5, 8, 28);
    const high = calculateUnionizedAmmoniaMgL(10, 8, 28);
    expect(high).toBeCloseTo(low * 2, 6);
  });
});

// src/lib/engine/ammoniaChemistry.ts
//
// Emerson et al. (1975) un-ionized ammonia equilibrium. Un-ionized ammonia
// (NH3) is the toxic fraction of total ammonia nitrogen (TAN); the ionized
// fraction (NH4+) is comparatively harmless. The fraction depends on pH and
// temperature, both of which shift the equilibrium toward more NH3 as they
// rise.
//
// pKa = 0.09018 + 2729.92 / T(Kelvin)
// fraction_unionized = 1 / (10^(pKa - pH) + 1)
//
// Verified two ways before shipping: (1) at 25C this reproduces the
// widely-cited ~9.25 pKa rule of thumb (yields 9.2466); (2) it reproduces
// Ch.7 S4's own illustrative examples -- "roughly 4.9% at pH 8/25C, ~8.7%
// at pH 8/32C" -- within about 1 percentage point (5.36% and 8.41% here).
// The guide's own examples don't state their source formula, and this one
// omits the smaller ionic-strength/salinity correction term some fuller
// models include, so treat the output as a close estimate, not an exact
// figure -- consistent with how Ch.7 S4 itself hedges with "roughly."
export function calculateUnionizedAmmoniaFraction(pH: number, temperatureC: number): number {
  const temperatureK = temperatureC + 273.15;
  const pKa = 0.09018 + 2729.92 / temperatureK;
  return 1 / (10 ** (pKa - pH) + 1);
}

export function calculateUnionizedAmmoniaMgL(
  tanMgL: number,
  pH: number,
  temperatureC: number
): number {
  return tanMgL * calculateUnionizedAmmoniaFraction(pH, temperatureC);
}

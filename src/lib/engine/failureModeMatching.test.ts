import { describe, it, expect } from "vitest";
import { matchFailureModes } from "./failureModeMatching";

describe("matchFailureModes", () => {
  it("matches molt-failure/soft-shell when potassium is below the Ch.6 §2 documented failure point", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 7 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(true);
  });

  it("does not match molt-failure when potassium is comfortably in the adequate range", () => {
    const matches = matchFailureModes({ salinityPpt: 2, pH: 7.5, potassiumMgL: 25 });
    expect(matches.some((m) => m.id === "molt-failure-soft-shell")).toBe(false);
  });

  it("returns an empty array when no related parameters are present", () => {
    const matches = matchFailureModes({ salinityPpt: 15, pH: 7.8 });
    expect(matches).toEqual([]);
  });
});

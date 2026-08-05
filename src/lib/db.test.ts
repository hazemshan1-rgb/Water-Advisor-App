import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db, createSite, saveAnalysis, getAnalysesForSite } from "./db";

describe("db", () => {
  beforeEach(async () => {
    await db.sites.clear();
    await db.analyses.clear();
  });

  it("creates a site with a generated id and createdAt", async () => {
    const site = await createSite({ name: "Nalgonda Well 3", sourceType: "borewell" });
    expect(site.id).toBeTruthy();
    expect(site.createdAt).toBeTruthy();
    const stored = await db.sites.get(site.id);
    expect(stored?.name).toBe("Nalgonda Well 3");
  });

  it("saves and retrieves analyses scoped to a site", async () => {
    const site = await createSite({ name: "Well A", sourceType: "borewell" });
    const otherSite = await createSite({ name: "Well B", sourceType: "borewell" });
    await saveAnalysis({
      id: "a1",
      siteId: site.id,
      date: "2026-08-05",
      parameters: { salinityPpt: 2, pH: 7.5 },
      targetSpeciesIds: [],
    });
    await saveAnalysis({
      id: "a2",
      siteId: otherSite.id,
      date: "2026-08-05",
      parameters: { salinityPpt: 15, pH: 7.8 },
      targetSpeciesIds: [],
    });

    const results = await getAnalysesForSite(site.id);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a1");
  });
});

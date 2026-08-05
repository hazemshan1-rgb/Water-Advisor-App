import Dexie, { type EntityTable } from "dexie";
import type { Site, Analysis } from "./types";

export const db = new Dexie("WaterAdvisorDB") as Dexie & {
  sites: EntityTable<Site, "id">;
  analyses: EntityTable<Analysis, "id">;
};

db.version(1).stores({
  sites: "id, name, sourceType, createdAt",
  analyses: "id, siteId, date",
});

export async function createSite(input: Omit<Site, "id" | "createdAt">): Promise<Site> {
  const site: Site = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.sites.add(site);
  return site;
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  await db.analyses.put(analysis);
}

export async function getAnalysesForSite(siteId: string): Promise<Analysis[]> {
  return db.analyses.where("siteId").equals(siteId).toArray();
}

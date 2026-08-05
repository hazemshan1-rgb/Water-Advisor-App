import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { POST } from "./route";
import type { Analysis, DiagnosisResult } from "@/lib/types";

describe("POST /api/advisor", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("rejects a request with an unrecognised mode", async () => {
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "bogus" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns extracted parameters for mode 'extract'", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ salinityPpt: 2, pH: 7.6, potassiumMgL: 8.4 }) }],
    });
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "extract", rawText: "Salinity: 2 ppt, pH 7.6, K+ 8.4 mg/L" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.parameters.salinityPpt).toBe(2);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns a chat reply for mode 'chat', with the diagnosis injected into the prompt", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "Here's why K+ matters..." }] });

    const analysis: Analysis = {
      id: "a1",
      siteId: "s1",
      date: "2026-08-05",
      parameters: { salinityPpt: 2, pH: 7.6, potassiumMgL: 8.4 },
      targetSpeciesIds: ["vannamei"],
    };
    const diagnosis: DiagnosisResult = {
      sourceAnomalies: ["Salinity band: ultra-low-1-5"],
      perSpecies: {},
      imtaNotes: [],
      matchedFailureModes: [],
      dosingPlan: [],
    };

    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      body: JSON.stringify({ mode: "chat", analysis, diagnosis, userMessage: "Why does K+ matter here?" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toContain("K+");
    const callArgs = mockCreate.mock.calls[0][0];
    expect(JSON.stringify(callArgs)).toContain("ultra-low-1-5");
  });
});

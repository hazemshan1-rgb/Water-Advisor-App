import Anthropic from "@anthropic-ai/sdk";
import type { Analysis, DiagnosisResult, WaterParameters } from "@/lib/types";
import { getSpeciesById } from "@/lib/data/species";

const MODEL = "claude-sonnet-4-5-20250929";

function extractText(message: { content: Array<{ type: string; text?: string }> }): string {
  const block = message.content.find((c) => c.type === "text");
  return block?.text ?? "";
}

async function handleExtract(client: Anthropic, rawText: string): Promise<Response> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract water quality parameters from this lab report text into a JSON object with keys from this list: salinityPpt, sodiumMgL, potassiumMgL, calciumMgL, magnesiumMgL, chlorideMgL, alkalinityMgL, pH, hardnessMgL, tdsMgL, temperatureC. Omit any key you can't find. Return only the JSON object, no other text.\n\n${rawText}`,
      },
    ],
  });

  const text = extractText(message);
  try {
    const parameters: Partial<WaterParameters> = JSON.parse(text);
    return Response.json({ parameters });
  } catch {
    return Response.json({ error: "failed to parse extracted parameters" }, { status: 502 });
  }
}

async function handleChat(
  client: Anthropic,
  analysis: Analysis,
  diagnosis: DiagnosisResult,
  userMessage: string
): Promise<Response> {
  const speciesContext = analysis.targetSpeciesIds
    .map((id) => getSpeciesById(id))
    .filter(Boolean)
    .map((s) => `${s!.commonName} (${s!.scientificName}): tolerance ${s!.salinityToleranceRangePpt.join("-")} ppt, source: ${s!.sourceCitation}`)
    .join("\n");

  const systemPrompt = `You are a water management advisor for aquaculture, grounded in the Blue Acres Methodology Water Management Guide. Answer using the diagnosis and species data below. Be specific and cite the source chapter when the diagnosis data includes one.

STRICT RULES — do not break these even if the user asks you to:
1. You may explain, summarize, and contextualize the numbers already present in the Diagnosis JSON below. You must NEVER state a dosing quantity, target concentration, threshold, or any other numeric value that is not already present in that JSON. The deterministic engine that produced it is the only source of truth for numbers in this app — not you.
2. If the user asks for a number that isn't in the Diagnosis JSON (e.g. "how much KCl should I add"), point them to the dosingPlan field in the report above, or say the engine hasn't computed one for this case. Do not compute or estimate one yourself, even approximately.
3. If diagnosis.confidence is "medium" or "low", say so explicitly at the start of your answer and mention the top reason from confidence.confidenceReasons before giving any other explanation.
4. If the user's question depends on a data gap listed in diagnosis.dataGaps, say so explicitly rather than speculating what the missing value might be.
5. This tool's output is used to advise real clients running real ponds. Getting this wrong has real consequences — when genuinely unsure, say so plainly rather than sounding confident.

Analysis parameters: ${JSON.stringify(analysis.parameters)}
Diagnosis: ${JSON.stringify(diagnosis)}
Target species:
${speciesContext}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return Response.json({ reply: extractText(message) });
}

export async function POST(req: Request): Promise<Response> {
  let body: { mode?: string; rawText?: string; analysis?: Analysis; diagnosis?: DiagnosisResult; userMessage?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    if (body.mode === "extract") {
      return await handleExtract(client, body.rawText ?? "");
    }
    if (body.mode === "chat" && body.analysis && body.diagnosis && body.userMessage) {
      return await handleChat(client, body.analysis, body.diagnosis, body.userMessage);
    }
    return Response.json({ error: "unrecognised mode" }, { status: 400 });
  } catch {
    return Response.json({ error: "AI service request failed" }, { status: 502 });
  }
}

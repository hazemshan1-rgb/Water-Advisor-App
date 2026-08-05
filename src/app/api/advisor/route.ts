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
  try {
    const body = await req.json();
    const client = new Anthropic();

    if (body.mode === "extract") {
      return handleExtract(client, body.rawText);
    }
    if (body.mode === "chat") {
      return handleChat(client, body.analysis, body.diagnosis, body.userMessage);
    }
    return Response.json({ error: "unrecognised mode" }, { status: 400 });
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }
}

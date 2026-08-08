import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { WaterParameters } from "@/lib/types";

// Field IDs from the live Jotform form "Water Quality Data Submission"
// (https://form.jotform.com/262195460671056), read via
// GET form/262195460671056/questions. Jotform auto-generates these names at
// creation time -- rebuilding the form means regenerating this map.
const FORM_ID = "262195460671056";

const CLIENT_NAME_FIELD = "q3_textbox1";
const SITE_NAME_FIELD = "q4_textbox2";
const EMAIL_FIELD = "q5_email3";
const TEST_DATE_FIELD = "q6_datetime4";
const VOLUME_FIELD = "q30_number28";
const NOTES_FIELD = "q31_textarea29";

const PARAMETER_FIELD_MAP: Record<string, keyof WaterParameters> = {
  q8_number6: "salinityPpt",
  q9_number7: "pH",
  q10_number8: "temperatureC",
  q12_number10: "sodiumMgL",
  q13_number11: "potassiumMgL",
  q14_number12: "calciumMgL",
  q15_number13: "magnesiumMgL",
  q16_number14: "chlorideMgL",
  q17_number15: "alkalinityMgL",
  q18_number16: "hardnessMgL",
  q19_number17: "tdsMgL",
  q21_number19: "ironMgL",
  q22_number20: "manganeseMgL",
  q23_number21: "hydrogenSulfideMgL",
  q24_number22: "arsenicMgL",
  q25_number23: "ammoniumMgL",
  q26_number24: "tanMgL",
  q27_number25: "nitriteMgL",
  q28_number26: "doMgL",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Jotform's rawRequest gives number fields as plain numeric strings and
// text/email fields as plain strings; a lite datetime field comes back as a
// single formatted string. Anything else (e.g. an unexpected object shape)
// is treated as absent rather than guessed at.
function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const str = asString(value);
  if (str === undefined) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

function extractParameters(answers: Record<string, unknown>): Partial<WaterParameters> {
  const parameters: Partial<WaterParameters> = {};
  for (const [fieldId, key] of Object.entries(PARAMETER_FIELD_MAP)) {
    const num = asNumber(answers[fieldId]);
    if (num !== undefined) {
      (parameters as Record<string, number>)[key] = num;
    }
  }
  return parameters;
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret");
  const expectedSecret = process.env.JOTFORM_WEBHOOK_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "invalid webhook payload" }, { status: 400 });
  }

  const submissionId = form.get("submissionID")?.toString();
  const formId = form.get("formID")?.toString();
  const rawRequestText = form.get("rawRequest")?.toString();

  if (!submissionId || !formId || !rawRequestText) {
    return Response.json({ error: "missing required Jotform fields" }, { status: 400 });
  }
  if (formId !== FORM_ID) {
    return Response.json({ error: "unexpected form id" }, { status: 400 });
  }

  let answers: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawRequestText);
    if (!isRecord(parsed)) throw new Error("rawRequest is not an object");
    answers = parsed;
  } catch {
    return Response.json({ error: "failed to parse rawRequest" }, { status: 400 });
  }

  const parameters = extractParameters(answers);

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("intake_submissions").upsert(
      {
        jotform_submission_id: submissionId,
        jotform_form_id: formId,
        client_name: asString(answers[CLIENT_NAME_FIELD]) ?? null,
        site_name: asString(answers[SITE_NAME_FIELD]) ?? null,
        contact_email: asString(answers[EMAIL_FIELD]) ?? null,
        test_date: asString(answers[TEST_DATE_FIELD]) ?? null,
        parameters,
        volume_m3: asNumber(answers[VOLUME_FIELD]) ?? null,
        notes: asString(answers[NOTES_FIELD]) ?? null,
        raw_payload: answers,
      },
      { onConflict: "jotform_submission_id" }
    );
    if (error) {
      console.error("intake insert failed", error);
      return Response.json({ error: "storage failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("intake handler failed", err);
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  return Response.json({ success: true });
}

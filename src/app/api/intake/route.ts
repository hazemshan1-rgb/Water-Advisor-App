import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Jotform's webhook POSTs multipart/form-data (not JSON), with rawRequest
// itself a JSON string keyed by internal question id, e.g.
// {"q3_fullName": {"first": "A", "last": "B"}, "q4_email": "a@b.com"}.
// See https://api.jotform.com/docs/#webhooks.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function flattenAnswerText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    const parts = Object.values(value).filter((v): v is string => typeof v === "string");
    if (parts.length) return parts.join(" ");
  }
  return undefined;
}

// Jotform's rawRequest doesn't cleanly separate "which field is the email
// field" -- it's keyed by internal ids like "q4_email3". This is a
// best-effort label match, not a guaranteed extraction; the full answers
// blob is stored regardless so nothing is lost if this misses.
function extractContact(rawRequest: Record<string, unknown>): { name?: string; email?: string } {
  let name: string | undefined;
  let email: string | undefined;

  for (const [key, value] of Object.entries(rawRequest)) {
    const lowerKey = key.toLowerCase();
    const text = flattenAnswerText(value);
    if (!text) continue;

    if (!email && lowerKey.includes("email")) email = text.trim();
    if (!name && (lowerKey.includes("name") || lowerKey.includes("fullname"))) name = text.trim();
  }

  return { name, email };
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
  const prettySummary = form.get("pretty")?.toString();

  if (!submissionId || !formId || !rawRequestText) {
    return Response.json({ error: "missing required Jotform fields" }, { status: 400 });
  }

  let answers: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawRequestText);
    if (!isRecord(parsed)) throw new Error("rawRequest is not an object");
    answers = parsed;
  } catch {
    return Response.json({ error: "failed to parse rawRequest" }, { status: 400 });
  }

  const { name, email } = extractContact(answers);

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("intake_submissions").upsert(
      {
        jotform_submission_id: submissionId,
        jotform_form_id: formId,
        answers,
        pretty_summary: prettySummary ?? null,
        contact_name: name ?? null,
        contact_email: email ?? null,
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

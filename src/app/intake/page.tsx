// src/app/intake/page.tsx
// Server component only -- reads via the service-role Supabase client
// (src/lib/supabaseAdmin.ts), which must never run in the browser.
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface IntakeSubmission {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  pretty_summary: string | null;
  status: string;
  received_at: string;
}

export default async function IntakePage() {
  let submissions: IntakeSubmission[] = [];
  let loadError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("intake_submissions")
      .select("id, contact_name, contact_email, pretty_summary, status, received_at")
      .order("received_at", { ascending: false });
    if (error) throw error;
    submissions = data ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "failed to load submissions";
  }

  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Intake</h1>
        <p className="text-sm text-amber-700">Supabase isn&apos;t configured yet: {loadError}</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Intake submissions</h1>

      {submissions.length === 0 ? (
        <p className="text-slate-500">No submissions yet.</p>
      ) : (
        <ul className="divide-y">
          {submissions.map((s) => (
            <li key={s.id} className="py-4 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{new Date(s.received_at).toLocaleString()}</span>
                <span className="uppercase tracking-wide">{s.status}</span>
              </div>
              <p className="font-medium">
                {s.contact_name ?? "Unknown"} &mdash; {s.contact_email ?? "no email"}
              </p>
              {s.pretty_summary && (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap">{s.pretty_summary}</pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

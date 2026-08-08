// src/app/intake/page.tsx
// Server component only -- reads via the service-role Supabase client
// (src/lib/supabaseAdmin.ts), which must never run in the browser.
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ImportButton } from "@/components/ImportButton";

export const dynamic = "force-dynamic";

interface IntakeSubmission {
  id: string;
  client_name: string | null;
  site_name: string | null;
  contact_email: string | null;
  test_date: string | null;
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
      .select("id, client_name, site_name, contact_email, test_date, status, received_at")
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
            <li key={s.id} className="py-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex gap-2 text-xs text-slate-500">
                  <span>{new Date(s.received_at).toLocaleString()}</span>
                  <span className="uppercase tracking-wide">{s.status}</span>
                </div>
                <p className="font-medium">{s.client_name ?? "Unknown client"}</p>
                <p className="text-sm text-slate-600">
                  {s.site_name ?? "no site name"} &middot; {s.contact_email ?? "no email"}
                  {s.test_date ? ` · tested ${s.test_date}` : ""}
                </p>
              </div>
              <ImportButton submissionId={s.id} siteName={s.site_name} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Called client-side from the /intake "Import" click-through and
// /analysis/new's prefill effect. Proxies the service-role Supabase read so
// the browser never needs its own Supabase credentials for this app.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("intake_submissions")
      .select("id, client_name, site_name, contact_email, test_date, parameters, volume_m3, notes, status")
      .eq("id", id)
      .single();

    if (error || !data) {
      return Response.json({ error: "submission not found" }, { status: 404 });
    }

    // Best-effort status update -- marking it seen shouldn't block the
    // caller from getting the data it asked for.
    if (data.status === "pending") {
      const { error: updateError } = await supabase
        .from("intake_submissions")
        .update({ status: "imported" })
        .eq("id", id);
      if (updateError) console.error("intake status update failed", updateError);
    }

    return Response.json({ submission: data });
  } catch (err) {
    console.error("intake fetch failed", err);
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }
}

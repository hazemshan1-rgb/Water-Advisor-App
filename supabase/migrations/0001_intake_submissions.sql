-- Jotform intake pipeline: raw webhook payloads land here before Hazem
-- reviews and imports one into a Site/Analysis pair in the app's per-browser
-- Dexie store (this table is the only server-side persistence in an
-- otherwise client-only app -- see src/lib/db.ts).
--
-- Maps to the live form "Water Quality Data Submission"
-- (https://form.jotform.com/262195460671056), field IDs baked into
-- src/app/api/intake/route.ts's FIELD_MAP. Rebuilding that form means
-- regenerating this mapping.
create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Dedup key: Jotform retries webhook delivery on non-2xx responses, and
  -- upserting on this avoids duplicate rows from those retries.
  jotform_submission_id text unique not null,
  jotform_form_id text not null,
  client_name text,
  site_name text,
  contact_email text,
  test_date text,
  -- Matches WaterParameters (src/lib/types.ts) exactly -- all 19 fields are
  -- required on the form, so this should always be complete, but stays
  -- jsonb rather than fixed columns since the two schemas can drift.
  parameters jsonb not null,
  volume_m3 numeric,
  notes text,
  -- Full unparsed rawRequest payload, kept for audit/debugging if the field
  -- mapping ever misses something.
  raw_payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'imported')),
  received_at timestamptz not null default now()
);

create index if not exists intake_submissions_status_idx on intake_submissions (status);
create index if not exists intake_submissions_received_at_idx on intake_submissions (received_at desc);

alter table intake_submissions enable row level security;

-- No policies defined on purpose: this table is written only by the
-- /api/intake webhook route and read only by /intake and /api/intake/[id],
-- all using the service-role key server-side, which bypasses RLS entirely.
-- There is no anon/browser access to this table at all -- consistent with
-- Hazem's confirmation that this app never gets a public URL handed to a
-- client, only the Jotform link does.

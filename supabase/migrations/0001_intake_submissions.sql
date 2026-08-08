-- Jotform intake pipeline: raw webhook payloads land here before anyone
-- manually reviews and imports them into a Site/Analysis pair in the app's
-- per-browser Dexie store (this table is the only server-side persistence
-- in an otherwise client-only app -- see src/lib/db.ts).
create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Dedup key: Jotform retries webhook delivery on non-2xx responses, and
  -- upserting on this avoids duplicate rows from those retries.
  jotform_submission_id text unique not null,
  jotform_form_id text not null,
  -- Full parsed rawRequest payload, keyed by Jotform field id. Kept
  -- unshaped (jsonb, not fixed columns) because no water-diagnostic intake
  -- form exists yet -- see hz-web project memory. Field mapping into
  -- WaterParameters happens at review time, not ingest time.
  answers jsonb not null,
  -- Jotform's own human-readable "Field: Answer" text, for a quick read on
  -- the /intake review page without re-deriving labels from answers.
  pretty_summary text,
  contact_name text,
  contact_email text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'imported', 'archived')),
  received_at timestamptz not null default now()
);

create index if not exists intake_submissions_status_idx on intake_submissions (status);
create index if not exists intake_submissions_received_at_idx on intake_submissions (received_at desc);

alter table intake_submissions enable row level security;

-- No policies defined on purpose: this table is written only by the
-- /api/intake webhook route and read only by the /intake review page, both
-- using the service-role key server-side, which bypasses RLS entirely.
-- There is no anon/browser access to this table at all.

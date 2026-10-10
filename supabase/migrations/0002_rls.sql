-- Migration 0002: Row Level Security policies
-- The backend uses the Supabase service role key, which bypasses RLS.
-- Public (anonymous + authenticated) access is limited to read-only published data.

begin;

-- Institutions: readable by everyone, writable only via service role (admin panel).
alter table public.institutions enable row level security;
create policy "public read institutions" on public.institutions
  for select to anon, authenticated using (true);

-- Branches: readable by everyone.
alter table public.branches enable row level security;
create policy "public read branches" on public.branches
  for select to anon, authenticated using (true);

-- Subjects: readable by everyone.
alter table public.subjects enable row level security;
create policy "public read subjects" on public.subjects
  for select to anon, authenticated using (true);

-- Papers: only PUBLISHED papers are visible to the public.
-- Draft/archived papers and all mutations stay service-role only.
alter table public.papers enable row level security;
create policy "public read published papers" on public.papers
  for select to anon, authenticated using (status = 'published');

-- Download stats, admins, activity logs, contact messages:
-- no public policies — fully locked down to the service role.
alter table public.download_stats enable row level security;
alter table public.admins enable row level security;
alter table public.activity_logs enable row level security;
alter table public.contact_messages enable row level security;

commit;

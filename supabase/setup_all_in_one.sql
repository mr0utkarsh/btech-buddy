-- ===========================================================
-- FROM 0001_schema.sql
-- ===========================================================
-- Migration 0001: core schema for BTech Buddy
-- Run with: supabase db reset  (or via Supabase dashboard > SQL Editor)

begin;

-- ---------------------------------------------------------------- institutions
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  type text not null check (type in ('university', 'college', 'institute')),
  city text not null default 'Katra',
  state text not null default 'Uttar Pradesh',
  affiliated_to uuid references public.institutions(id) on delete set null,
  website text,
  established_year int check (established_year > 1800 and established_year < 2100),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_institutions_name unique (name),
  constraint uq_institutions_short_name unique (short_name),
  constraint no_self_affiliation check (affiliated_to is null or affiliated_to <> id)
);

-- -------------------------------------------------------------------- branches
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_branches_name unique (name),
  constraint uq_branches_code unique (code)
);

-- ------------------------------------------------------------------- subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  semester int not null check (semester between 1 and 8),
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_subjects unique (branch_id, semester, name)
);

-- --------------------------------------------------------------------- papers
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  semester int not null check (semester between 1 and 8),
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  subject_code text,
  paper_code text,
  exam_type text not null default 'regular'
    check (exam_type in ('regular', 'supply', 'improvement', 'preparatory', 'other')),
  exam_year int not null check (exam_year between 1990 and 2100),
  original_path text not null,
  processed_path text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  page_count int not null check (page_count > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  download_count bigint not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_papers_institution on public.papers (institution_id);
create index if not exists idx_papers_branch on public.papers (branch_id);
create index if not exists idx_papers_subject on public.papers (subject_id);
create index if not exists idx_papers_semester on public.papers (semester);
create index if not exists idx_papers_exam_year on public.papers (exam_year);
create index if not exists idx_papers_exam_type on public.papers (exam_type);
create index if not exists idx_papers_status on public.papers (status);
create index if not exists idx_papers_created on public.papers (created_at desc);
create index if not exists idx_papers_downloads on public.papers (download_count desc);

-- -------------------------------------------------------------- download stats
create table if not exists public.download_stats (
  id bigint primary key generated always as identity,
  paper_id uuid not null references public.papers(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);

create index if not exists idx_download_stats_paper on public.download_stats (paper_id);
create index if not exists idx_download_stats_time on public.download_stats (downloaded_at desc);

-- ---------------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('super_admin', 'admin')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint uq_admins_email unique (email)
);

-- ------------------------------------------------------------- activity logs
create table if not exists public.activity_logs (
  id bigint primary key generated always as identity,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_time on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_action on public.activity_logs (action);
create index if not exists idx_activity_logs_entity on public.activity_logs (entity_type, entity_id);

-- --------------------------------------------------------- contact messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  subject text check (char_length(subject) between 3 and 150),
  message text not null check (char_length(message) between 10 and 5000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

do $$
begin
  create trigger trg_institutions_updated before update on public.institutions
    for each row execute function public.set_updated_at();
  create trigger trg_branches_updated before update on public.branches
    for each row execute function public.set_updated_at();
  create trigger trg_subjects_updated before update on public.subjects
    for each row execute function public.set_updated_at();
  create trigger trg_papers_updated before update on public.papers
    for each row execute function public.set_updated_at();
end
$$;

-- ------------------------------------------------------------- storage bucket
-- Private bucket: originals/ and processed/ prefixes.
-- No RLS policies are granted â€” only the service role (backend) can access it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 104857600, array['application/pdf'::text])
on conflict (id) do nothing;

commit;

-- ===========================================================
-- FROM 0002_rls.sql
-- ===========================================================
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
-- no public policies â€” fully locked down to the service role.
alter table public.download_stats enable row level security;
alter table public.admins enable row level security;
alter table public.activity_logs enable row level security;
alter table public.contact_messages enable row level security;

commit;

-- ===========================================================
-- FROM 0003_seed.sql
-- ===========================================================
-- NOTE (customer catalog restriction): this file seeds ONLY the supported catalog:
--   University: Shri Mata Vaishno Devi University (SMVDU), Katra
--   Branch:     CSE
--   Specialization: AI and Robotics (added by Migration 0006 below)
-- Obsolete legacy Kanpur institutions/branches are NOT seeded so they cannot
-- return after a reseed. Migration 0006 (appended at the end of this file)
-- enforces the same restriction on any existing database.
-- Universities are distinguished from colleges/institutes via `type`.

begin;

-- ============================================================ UNIVERSITIES
-- Only SMVDU (Katra) is supported in this deployment.
insert into public.institutions (name, short_name, type, city, state, website, established_year, verified) values
  ('Shri Mata Vaishno Devi University', 'SMVDU', 'university', 'Katra', 'Jammu and Kashmir',
   'https://www.smvdu.ac.in', 1999, true)
on conflict (name) do nothing;

-- ================================================================= BRANCHES
-- Only the CSE branch is supported in this deployment.
insert into public.branches (name, code) values
  ('Computer Science and Engineering', 'CSE')
on conflict (name) do nothing;

-- ================================================================ SUBJECTS
-- Pattern: FROM branch CROSS JOIN (values ...) WHERE code â€” joins must
-- precede the WHERE clause in PostgreSQL.

-- ------------------------------ CSE (all 8 semesters)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Basic Electrical Engineering'),
  ('Engineering Mechanics'),
  ('Programming for Problem Solving')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Data Structures'),
  ('Computer Organization and Architecture'),
  ('Object Oriented Programming'),
  ('Discrete Mathematics')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Data Structures and Algorithms'),
  ('Operating Systems'),
  ('Database Management Systems'),
  ('Computer Networks'),
  ('Theory of Computation'),
  ('Digital Electronics')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Design and Analysis of Algorithms'),
  ('Software Engineering'),
  ('Compiler Design'),
  ('Microprocessors and Microcontrollers'),
  ('Artificial Intelligence')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 5, x
from public.branches b
cross join (values
  ('Computer Architecture'),
  ('Advanced Database Systems'),
  ('Network Security'),
  ('Machine Learning'),
  ('Web Technologies'),
  ('Software Testing')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 6, x
from public.branches b
cross join (values
  ('Cloud Computing'),
  ('Data Mining'),
  ('Internet of Things'),
  ('Mobile Computing'),
  ('Distributed Systems')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 7, x
from public.branches b
cross join (values
  ('Deep Learning'),
  ('Natural Language Processing'),
  ('Big Data Analytics'),
  ('Information Security'),
  ('Embedded Systems')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 8, x
from public.branches b
cross join (values
  ('Robotics'),
  ('Computer Vision'),
  ('Software Project Management'),
  ('Blockchain Technology')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

commit;

-- ===========================================================
-- FROM 0004_downloads.sql
-- ===========================================================
-- Migration 0004: helpers for download tracking

begin;

-- Atomic download counter (called by the backend via RPC).
create or replace function public.increment_download(p_paper_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.papers
  set download_count = download_count + 1
  where id = p_paper_id;
end
$$;

-- Restrict who can call the RPC: only authenticated roles used by the
-- backend service. (The service role bypasses this anyway.)
revoke all on function public.increment_download(uuid) from public, anon, authenticated;
grant execute on function public.increment_download(uuid) to service_role;

commit;

-- ===========================================================
-- FROM 0005_exam_types.sql
-- ===========================================================
-- Add Mid-Sem and End-Sem exam types.
-- Safe & idempotent: drop the existing auto-named check constraint and re-add
-- it with the extended value set. All previous values are retained.
alter table public.papers
  drop constraint if exists papers_exam_type_check;

alter table public.papers
  add constraint papers_exam_type_check
  check (exam_type in (
    'regular', 'supply', 'improvement', 'preparatory', 'mid_sem', 'end_sem', 'other'
  ));

-- Mid-Sem / End-Sem are the most common browsing targets after upload;
-- keep the existing exam_type index (already created in 0001_schema.sql).


-- ===========================================================
-- FROM 0006_smvdu_catalog.sql
-- ===========================================================
-- Migration 0006: Restrict the catalog to SMVDU / CSE / AI & Robotics
-- ----------------------------------------------------------------------------
-- Customer requirement: the application must expose ONLY
--   University:      Shri Mata Vaishno Devi University (SMVDU), Katra
--   Branch:          CSE (Computer Science and Engineering)
--   Specialization:  AI and Robotics  (ONE combined option, never split)
--
-- This migration is:
--   * Idempotent  — safe to run more than once.
--   * Reversible  — it first copies rows it is about to remove into backup
--                   tables (`*_backup_0006`). See the ROLLBACK section below.
--   * FK-safe     — papers reference institutions/branches with ON DELETE
--                   RESTRICT, so papers are removed FIRST; subjects cascade
--                   from branches and download_stats cascade from papers.
--
-- User accounts, auth, admins, activity logs and contact messages are NOT
-- touched.
-- ============================================================================

begin;

-- ------------------------------------------------------- 0. BACKUP (rollback)
create table if not exists public.institutions_backup_0006 as
  select * from public.institutions;
create table if not exists public.branches_backup_0006 as
  select * from public.branches;
create table if not exists public.subjects_backup_0006 as
  select * from public.subjects;
create table if not exists public.papers_backup_0006 as
  select * from public.papers;

-- ------------------------------------------------- 1. ENSURE SMVDU EXISTS
insert into public.institutions (name, short_name, type, city, state, website, established_year, verified)
values (
  'Shri Mata Vaishno Devi University',
  'SMVDU',
  'university',
  'Katra',
  'Jammu and Kashmir',
  'https://www.smvdu.ac.in',
  1999,
  true
)
on conflict (name) do nothing;

-- ------------------------------------------------- 2. SPECIALIZATIONS TABLE
create table if not exists public.specializations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  branch_id uuid references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_specializations_name unique (name)
);

-- "AI and Robotics" is a single combined specialization.
insert into public.specializations (name, code, branch_id)
select 'AI and Robotics', 'AI&ROB', b.id
from public.branches b
where b.code = 'CSE'
on conflict (name) do nothing;

-- Public read access (mirrors branches/subjects policies in 0002_rls.sql).
alter table public.specializations enable row level security;
drop policy if exists "public read specializations" on public.specializations;
create policy "public read specializations" on public.specializations
  for select to anon, authenticated using (true);

-- --------------------------------------- 3. ENSURE CSE BRANCH EXISTS
insert into public.branches (name, code)
values ('Computer Science and Engineering', 'CSE')
on conflict (name) do nothing;

-- ------------------------------------------ 4. REMOVE NON-CONFORMING PAPERS
-- Keep only papers whose institution is SMVDU AND whose branch is CSE.
-- download_stats cascade automatically. subject_id becomes NULL (SET NULL).
delete from public.papers p
where p.institution_id not in (
        select id from public.institutions where short_name = 'SMVDU'
      )
   or p.branch_id not in (
        select id from public.branches where code = 'CSE'
      );

-- ------------------------------------- 5. REMOVE NON-CSE BRANCHES / SUBJECTS
delete from public.subjects s
where s.branch_id not in (select id from public.branches where code = 'CSE');

delete from public.branches
where code is distinct from 'CSE';

-- --------------------------------------- 6. REMOVE NON-SMVDU INSTITUTIONS
update public.institutions set affiliated_to = null
where affiliated_to is not null;

delete from public.institutions
where short_name is distinct from 'SMVDU';

-- ------------------------------ 7. ADD specialization_id TO PAPERS (nullable)
alter table public.papers
  add column if not exists specialization_id uuid
  references public.specializations(id) on delete set null;

-- Default every existing paper to the AI & Robotics specialization.
update public.papers p
set specialization_id = s.id
from public.specializations s
where s.name = 'AI and Robotics'
  and p.specialization_id is null;

create index if not exists idx_papers_specialization on public.papers (specialization_id);

-- --------------------------------------------- 8. CSE SUBJECTS (AI & Robotics)
insert into public.subjects (branch_id, semester, name)
select b.id, sem, subj
from public.branches b
cross join (values
  (1, 'Engineering Mathematics-I'),
  (1, 'Programming for Problem Solving'),
  (2, 'Data Structures'),
  (2, 'Engineering Mathematics-II'),
  (3, 'Design and Analysis of Algorithms'),
  (3, 'Object Oriented Programming'),
  (4, 'Artificial Intelligence'),
  (5, 'Machine Learning'),
  (6, 'Robotics'),
  (7, 'Computer Vision'),
  (8, 'Deep Learning')
) as t(sem, subj)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

commit;

-- ============================================================================
-- ROLLBACK (manual): restore the pre-migration catalog from the backup tables.
-- Execute inside a transaction to undo 0006.
--
--   begin;
--   alter table public.papers drop column if exists specialization_id;
--   truncate public.papers;
--   insert into public.papers select * from public.papers_backup_0006;
--   truncate public.subjects;
--   insert into public.subjects select * from public.subjects_backup_0006;
--   truncate public.branches;
--   insert into public.branches select * from public.branches_backup_0006;
--   truncate public.institutions;
--   insert into public.institutions select * from public.institutions_backup_0006;
--   drop table if exists public.specializations;
--   commit;
-- ============================================================================


-- ===========================================================
-- FROM 0007_admin_password.sql
-- ===========================================================
-- Adds a `must_change_password` flag to `admins`. It is set to true when a
-- Super Admin invites a new admin with a temporary password, and cleared only
-- after that admin completes their first password change (via Supabase Auth).
-- While the flag is set the backend blocks every admin operation except
-- reading `/api/admin/admins/me` and the change-password completion endpoint.
-- Idempotent; existing admin rows default to false so current admins are
-- unaffected. Passwords themselves are NEVER stored here.
-- ========================================================================== --

begin;

alter table public.admins
  add column if not exists must_change_password boolean not null default false;

comment on column public.admins.must_change_password is
  'True while the admin must change a temporary password before using the dashboard.';

commit;

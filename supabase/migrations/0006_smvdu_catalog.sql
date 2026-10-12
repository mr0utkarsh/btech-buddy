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


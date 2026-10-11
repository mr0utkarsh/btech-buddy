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
  city text not null default 'Kanpur',
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
-- Migration 0003: seed verified Kanpur institutions, branches, subjects
-- Universities are distinguished from colleges/institutes via `type`.
-- Colleges/institutes carry `affiliated_to` pointing at their university.

begin;

-- ============================================================ UNIVERSITIES
insert into public.institutions (name, short_name, type, city, state, website, established_year, verified) values
  ('Chhatrapati Shahu Ji Maharaj University', 'CSJMU', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.csjmu.ac.in', 1966, true),
  ('Harcourt Butler Technical University', 'HBTU', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.hbtu.ac.in', 1921, true),
  ('Rama University', 'Rama University', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.ramauniversity.ac.in', 2015, true),
  ('Chandra Shekhar Azad University of Agriculture and Technology', 'CSA University', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.csau.res.in', 1975, true),
  ('Indian Institute of Technology Kanpur', 'IIT Kanpur', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.iitk.ac.in', 1959, true),
  ('Dr. A.P.J. Abdul Kalam Technical University', 'AKTU', 'university', 'Lucknow', 'Uttar Pradesh',
   'https://aktu.ac.in', 2000, true)
on conflict (name) do nothing;

-- ================================================== COLLEGES / INSTITUTES
-- Affiliated to AKTU (subquery resolves AKTU's uuid at insert time).
insert into public.institutions (name, short_name, type, city, state, affiliated_to, website, established_year, verified) values
  ('Pranveer Singh Institute of Technology', 'PSIT', 'college', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.psit.ac.in', 2006, true),
  ('Ambalika Institute of Technology and Management', 'AITH', 'college', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.ambalika.ac.in', 2008, true),
  ('Uttar Pradesh Textile Technology Institute', 'UPTTI', 'institute', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.uptti.ac.in', 1914, true),
  ('National Sugar Institute', 'NSI', 'institute', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.nsi-india.org', 1936, true)
on conflict (name) do nothing;

-- ================================================================= BRANCHES
insert into public.branches (name, code) values
  ('Computer Science and Engineering', 'CSE'),
  ('Information Technology', 'IT'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical Engineering', 'EE'),
  ('Mechanical Engineering', 'ME'),
  ('Civil Engineering', 'CE'),
  ('Chemical Engineering', 'CHE'),
  ('Aeronautical Engineering', 'AE'),
  ('Biotechnology', 'BT'),
  ('Artificial Intelligence and Data Science', 'AI&DS'),
  ('Artificial Intelligence and Machine Learning', 'AI&ML'),
  ('Computer Science and Business Systems', 'CSBS')
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

-- ------------------------------ IT (all 8 semesters, CSE-like catalog)
insert into public.subjects (branch_id, semester, name)
select b.id, s.semester, s.name
from public.branches b
cross join (
  select semester, unnest(subjects) as name from (
    values
      (1, array['Engineering Mathematics-I','Engineering Physics','Engineering Chemistry','Basic Electrical Engineering','Engineering Mechanics','Programming for Problem Solving']),
      (2, array['Engineering Mathematics-II','Engineering Graphics','Data Structures','Computer Organization and Architecture','Object Oriented Programming','Discrete Mathematics']),
      (3, array['Data Structures and Algorithms','Operating Systems','Database Management Systems','Computer Networks','Digital Electronics','Theory of Computation']),
      (4, array['Design and Analysis of Algorithms','Software Engineering','Compiler Design','Microprocessors and Microcontrollers','Artificial Intelligence']),
      (5, array['Computer Networks','Machine Learning','Web Technologies','Software Testing','Network Security','Database Systems']),
      (6, array['Cloud Computing','Data Mining','Internet of Things','Mobile Computing','Distributed Systems','Cyber Security']),
      (7, array['Deep Learning','Big Data Analytics','Information Security','Embedded Systems','Natural Language Processing']),
      (8, array['Robotics','Computer Vision','Software Project Management','Blockchain Technology'])
  ) as t(semester, subjects)
) s
where b.code = 'IT'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ ECE (sem 1-4)
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
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Circuit Theory'),
  ('Analog Electronics'),
  ('Digital Electronics'),
  ('Signals and Systems')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Electromagnetic Theory'),
  ('Electronic Devices and Circuits'),
  ('Communication Systems'),
  ('Digital Signal Processing'),
  ('Control Systems'),
  ('Computer Networks')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('VLSI Design'),
  ('Microprocessors and Microcontrollers'),
  ('Antenna Theory'),
  ('Digital Communication'),
  ('Embedded Systems')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ EE (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Basic Electrical Engineering'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Circuit Theory'),
  ('Electrical Machines-I'),
  ('Engineering Thermodynamics'),
  ('Electromagnetic Theory')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Electrical Machines-II'),
  ('Power Systems'),
  ('Control Systems'),
  ('Electrical Measurements'),
  ('Digital Electronics')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Power Electronics'),
  ('Electrical Drives'),
  ('Microprocessors and Microcontrollers'),
  ('Instrumentation'),
  ('Renewable Energy Sources')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ ME (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Engineering Thermodynamics'),
  ('Mechanics of Materials'),
  ('Theory of Machines'),
  ('Fluid Mechanics')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Machine Design'),
  ('Heat Transfer'),
  ('Internal Combustion Engines'),
  ('Manufacturing Technology'),
  ('Control Systems')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Refrigeration and Air Conditioning'),
  ('Industrial Engineering'),
  ('CAD/CAM'),
  ('Mechatronics'),
  ('Automobile Engineering')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ CE (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Surveying'),
  ('Mechanics of Materials'),
  ('Fluid Mechanics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Structural Analysis'),
  ('Concrete Technology'),
  ('Geotechnical Engineering'),
  ('Transportation Engineering'),
  ('Hydraulics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Design of Concrete Structures'),
  ('Design of Steel Structures'),
  ('Water Resources Engineering'),
  ('Environmental Engineering'),
  ('Highway Engineering')) as t(x)
where b.code = 'CE'
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


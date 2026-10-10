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
-- No RLS policies are granted — only the service role (backend) can access it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 104857600, array['application/pdf'::text])
on conflict (id) do nothing;

commit;

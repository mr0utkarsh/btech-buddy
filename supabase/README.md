# Supabase setup notes

## 1. Create the project
1. Create a new project at https://supabase.com/dashboard
2. Wait for the database to provision.

## 2. Apply migrations
Option A (recommended, Supabase CLI):
```bash
supabase db reset          # runs supabase/migrations/*.sql in order
```
Option B (Dashboard):
Open **SQL Editor** and run, in order:
- `supabase/migrations/0001_schema.sql`
- `supabase/migrations/0002_rls.sql`
- `supabase/migrations/0003_seed.sql`
- `supabase/migrations/0004_downloads.sql`
- `supabase/migrations/0005_exam_types.sql`

## 3. Verify
- Tables created: institutions, branches, subjects, papers, download_stats,
  admins, activity_logs, contact_messages
- Private storage bucket `pdfs` exists (public = false)
- Seeded institutions include CSJMU, HBTU, Rama University, CSA University,
  IIT Kanpur, AKTU (universities) and PSIT, AITH, UPTTI, National Sugar
  Institute (colleges/institutes affiliated to AKTU)

## 4. Supabase Auth settings
- Authentication > Providers > Email: enable **Email/Password**
- No email confirmation required for admin accounts (the backend creates
  confirmed users directly via the Admin API)

## 5. Credentials for the backend
Copy `.env.example` to `.env` and set:
- `SUPABASE_URL` — project URL
- `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings > API
- `SUPABASE_JWT_SECRET` — from Authentication > JWT Secret (only needed for
  older HS256 projects; newer projects use RS256/JWKS and are detected
  automatically)
- `INITIAL_SUPER_ADMIN_EMAIL` + `INITIAL_SUPER_ADMIN_PASSWORD` — used once on
  backend startup to create the first super admin (e.g. admin@yoursite.com).
  Choose a strong password. These values are read from the environment only —
  they are never stored in source code.

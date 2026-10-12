# Deployment & Migration Runbook

The frontend redesign + theme system is **already live** in production. The items
below are the remaining manual steps that require dashboard/credential access not
available from the CLI in this environment. All are safe and reversible.

## 0. Backend self-heal (automatic)

On startup the backend now runs `ensure_catalog()` (in `backend/app/main.py`),
which idempotently creates the SMVDU institution, CSE branch and (once the
`specializations` table exists) the "AI and Robotics" specialization if they are
missing. So even before you run migration 0006, the live site recovers from an
empty catalog as soon as the new backend is deployed. It only ever *adds* these
three rows and never deletes data.

## 1. Apply database migrations (Supabase) — REQUIRED

Two migrations need to be applied in the Supabase Dashboard -> SQL Editor:

### 1a. `supabase/migrations/0006_smvdu_catalog.sql` (catalog cleanup)
Paste the full file into a new SQL query and run once (idempotent). It:
- Backs up `institutions`, `branches`, `subjects`, `papers` into `*_backup_0006`.
- Ensures SMVDU Katra + CSE exist and creates the `specializations` table with
  the single combined row "AI and Robotics".
- Deletes non-SMVDU / non-CSE papers first (respects ON DELETE RESTRICT), then
  non-CSE branches/subjects, then non-SMVDU institutions.
- Adds `papers.specialization_id` (nullable) defaulting to AI & Robotics and
  seeds a representative CSE AI & Robotics subject catalog.

Rollback is documented at the bottom of the file (restores from `*_backup_0006`).
User accounts, auth, admins and activity logs are never touched.

### 1b. `supabase/migrations/0007_admin_password.sql` (admin password flow)
Paste the full file and run once (idempotent). It adds a
`must_change_password boolean not null default false` column to `admins`.
Existing admins default to false so they are unaffected; only newly invited
admins get it set to true.

Alternatively, for a brand-new database run `supabase/setup_all_in_one.sql`,
which now ends with migrations 0006 + 0007 (and seeds only SMVDU/CSE), so a
fresh reseed lands on the restricted catalog.

## 2. Deploy the backend (Render) — REQUIRED

The backend changes are committed and pushed to `main`. From the Render dashboard:

- Render Dashboard -> **btech-buddy-backend** -> **Manual Deploy -> Deploy latest commit**.

### 2a. Update the watermark env var (Render) — REQUIRED
The question-paper PDF watermark text is now **"Evee bhaiya"** (was "BTech Buddy").
`render.yaml` is updated, but Render does not auto-sync env changes to an existing
service. Set it manually:

- Render -> **btech-buddy-backend** -> **Environment** -> set `WATERMARK_TEXT=Evee bhaiya` -> Save / redeploy.

Note: the watermark is baked into stored PDFs at upload/replace time, so already
uploaded papers keep the old watermark until re-uploaded. (Production currently has
0 published papers, so nothing needs reprocessing.) The website brand stays "BTech Buddy".

## 3. Super Admin account (vishalkumar829987@gmail.com) — REQUIRED

`GET /api/setup-status` currently reports `super_admin_exists: true`, so a super
admin already exists (created from `INITIAL_SUPER_ADMIN_EMAIL`). I cannot verify
which email it is without Supabase access, and must not take over or duplicate an
account. To make **vishalkumar829987@gmail.com** a Super Admin through the secure,
existing flow:

1. Sign in as the current super admin at https://btech-buddy-six.vercel.app/login.
2. Go to **Admin -> Admins -> Invite**, enter `vishalkumar829987@gmail.com`, role
   **Super Admin**.
3. Copy the one-time temporary password shown, relay it securely. On first sign-in
   that admin is forced to set their own password.
4. (Optional) Revoke/remove the old super admin from the Admins screen once verified.

Do **not** hardcode any password. If instead you want the bootstrap to create this
account from scratch, set `INITIAL_SUPER_ADMIN_EMAIL=vishalkumar829987@gmail.com`
and a strong `INITIAL_SUPER_ADMIN_PASSWORD` in Render (never in Git) *before* a
super admin exists.

## 4. Frontend — already deployed (redeploy to pick up latest)

Already on the existing Vercel project (https://btech-buddy-six.vercel.app): three
themes, Settings page, Help & Support email, change-password screens. Pushing to
`main` redeploys if Git integration is connected; otherwise redeploy from Vercel.

## 5. Verify after deploy

- `GET /api/health` -> ok, supabase_configured true.
- `GET /api/institutions` -> only SMVDU.
- `GET /api/branches` -> only CSE.
- `GET /api/specializations` -> only "AI and Robotics".
- Site -> Settings -> switch Dark Futuristic / Clean Premium / Hybrid; reload to
  confirm persistence.
- Help & Support (Contact + Footer) shows clickable
  `mailto:vishalkumar829987@gmail.com`.
- Invite a test admin -> sign in -> forced "Set a new password" screen -> set a
  strong password -> dashboard unlocks. Later change via Settings -> Security.

## Secrets

No secrets were committed. The Supabase service-role key stays server-side only
(backend `config.py`); the frontend uses only the anon key. `frontend/.env.local`
remains git-ignored.

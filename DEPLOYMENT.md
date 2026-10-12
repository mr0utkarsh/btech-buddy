# Deployment & Migration Runbook

The frontend redesign + theme system is **already live** in production. Two steps
remain to complete the SMVDU / CSE / AI & Robotics catalog restriction, because
they require dashboard/credential access that is not available from the CLI in
this environment. Both are safe and reversible.

## 1. Apply the database migration (Supabase) — REQUIRED

The new backend code and the catalog restriction depend on migration
`supabase/migrations/0006_smvdu_catalog.sql`. Until it is applied, the
production database still contains the legacy Kanpur institutions/branches.

**How to apply (Supabase Dashboard -> SQL Editor):**
1. Open your project -> SQL Editor -> New query.
2. Paste the full contents of `supabase/migrations/0006_smvdu_catalog.sql`.
3. Run it once. It is idempotent (safe to re-run).

**What it does (FK-safe, ordered):**
- Backs up `institutions`, `branches`, `subjects`, `papers` into `*_backup_0006`.
- Ensures SMVDU Katra + CSE branch exist.
- Creates the `specializations` table with the single combined row "AI and Robotics".
- Deletes non-SMVDU / non-CSE papers first (respects ON DELETE RESTRICT), then
  non-CSE branches/subjects, then non-SMVDU institutions.
- Adds `papers.specialization_id` (nullable) defaulting to AI & Robotics.
- Seeds a representative CSE AI & Robotics subject catalog.

**Rollback** is documented at the bottom of the migration file (restores from the
`*_backup_0006` tables). User accounts, auth, admins and activity logs are never
touched.

Alternatively, for a brand-new database, run `supabase/setup_all_in_one.sql`
which now ends with migration 0006, so a fresh reseed lands on SMVDU/CSE only.

## 2. Deploy the backend (Render) — REQUIRED for the API restriction

The backend changes are committed and pushed to `main`. Trigger the deploy from
the Render dashboard:

- Render Dashboard -> **btech-buddy-backend** -> **Manual Deploy -> Deploy latest commit**
  (commit `c04130d` or later).

The new code is backward-compatible: if migration 0006 has not been applied yet,
the `/api/specializations` endpoint and specialization filters degrade gracefully
(empty), and paper listing/browsing/uploads keep working. Apply the migration
first, then deploy, for the cleanest result — but either order is safe.

## 3. Frontend — DONE

Already deployed to the existing Vercel project and verified live at
https://btech-buddy-six.vercel.app (three themes, pre-paint theme script,
Settings page). No further action needed.

## 4. Verify after deploy

- `GET https://btech-buddy-backend.onrender.com/api/papers/filters`
  -> institutions should contain only SMVDU, branches only CSE,
  specializations only "AI and Robotics".
- `GET https://btech-buddy-backend.onrender.com/api/institutions` -> only SMVDU.
- `GET https://btech-buddy-backend.onrender.com/api/branches` -> only CSE.
- Site -> Settings -> switch between Dark Futuristic / Clean Premium / Hybrid;
  reload to confirm the choice persists.

## Secrets

No secrets were committed. The Supabase service-role key stays server-side only
(backend `config.py`); the frontend uses only the anon key. `frontend/.env.local`
remains git-ignored.

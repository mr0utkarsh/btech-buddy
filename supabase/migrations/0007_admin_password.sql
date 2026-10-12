-- =============================================================================
-- Migration 0007: Force initial password change for newly created admins
-- -----------------------------------------------------------------------------
-- Adds a `must_change_password` flag to `admins`. It is set to true when a
-- Super Admin invites a new admin with a temporary password, and cleared only
-- after that admin completes their first password change (via Supabase Auth).
-- While the flag is set the backend blocks every admin operation except
-- reading `/api/admin/admins/me` and the change-password completion endpoint.
--
-- Notes:
--   * Idempotent  — safe to run more than once.
--   * Passwords themselves are NEVER stored here (Supabase Auth owns them).
--   * Existing admin rows default to `false` so current admins are unaffected.
-- ========================================================================== --
begin;

alter table public.admins
  add column if not exists must_change_password boolean not null default false;

comment on column public.admins.must_change_password is
  'True while the admin must change a temporary password before using the dashboard.';

commit;
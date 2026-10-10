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

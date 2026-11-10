-- =====================================================================
-- STRUCTURA — durées de conservation (RGPD). À exécuter chaque jour
-- (pg_cron sur Supabase, voir docs/DEPLOIEMENT.md) :
--   select public.retention_cleanup();
-- =====================================================================

create or replace function public.retention_cleanup()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v jsonb := '{}'::jsonb;
  n integer;
begin
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics n = row_count; v := v || jsonb_build_object('rate_limits', n);
  -- usage de l'IA (compteurs, sans contenu) : 12 mois
  delete from public.ai_usage where created_at < now() - interval '12 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('ai_usage', n);
  -- notifications lues : 6 mois ; non lues : 12 mois
  delete from public.notifications where (read_at is not null and read_at < now() - interval '6 months') or created_at < now() - interval '12 months';
  get diagnostics n = row_count; v := v || jsonb_build_object('notifications', n);
  -- signalements clos : 2 ans
  delete from public.reports where status in ('resolved', 'rejected') and coalesce(handled_at, created_at) < now() - interval '2 years';
  get diagnostics n = row_count; v := v || jsonb_build_object('reports', n);
  -- journal d'audit : 1 an
  delete from public.audit_logs where created_at < now() - interval '1 year';
  get diagnostics n = row_count; v := v || jsonb_build_object('audit_logs', n);
  return v;
end $$;

-- Comptes inactifs depuis 3 ans (à prévenir par e-mail puis supprimer, voir docs/RGPD.md).
create or replace function public.inactive_accounts(p_years integer default 3)
returns table (id uuid, email text, last_activity timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text, greatest(u.last_sign_in_at, u.created_at)
  from auth.users u join public.profiles p on p.id = u.id
  where p.role = 'student' and greatest(u.last_sign_in_at, u.created_at) < now() - make_interval(years => p_years);
$$;

revoke execute on function public.retention_cleanup() from public, anon, authenticated;
revoke execute on function public.inactive_accounts(integer) from public, anon, authenticated;
grant execute on function public.retention_cleanup() to service_role;
grant execute on function public.inactive_accounts(integer) to service_role;

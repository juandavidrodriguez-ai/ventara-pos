-- VENTARA POS - hardening for production Supabase
-- Safe to run more than once.

create table if not exists public.ventara_state (
  company_id uuid primary key references public.companies(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

create unique index if not exists ventara_accounts_company_username_uidx
  on public.ventara_accounts(company_id, username);

create unique index if not exists ventara_accounts_company_user_uidx
  on public.ventara_accounts(company_id, user_id);

alter table public.ventara_accounts enable row level security;
alter table public.ventara_state enable row level security;

drop policy if exists "ventara_accounts_read_own" on public.ventara_accounts;
create policy "ventara_accounts_read_own"
on public.ventara_accounts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "ventara_state_read_company" on public.ventara_state;
create policy "ventara_state_read_company"
on public.ventara_state
for select
to authenticated
using (
  exists (
    select 1
    from public.ventara_accounts a
    where a.company_id = ventara_state.company_id
      and a.user_id = auth.uid()
      and a.active = true
  )
);

-- Writes to ventara_state are intentionally kept behind the application/service role.
-- The browser must never receive a service-role key.
drop policy if exists "ventara_state_write_company" on public.ventara_state;

comment on table public.ventara_state is
  'Persistent VENTARA POS state per company. Browser uses Supabase publishable key; write policy is intentionally restricted.';

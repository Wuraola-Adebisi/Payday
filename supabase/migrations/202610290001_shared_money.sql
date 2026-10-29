-- Payday Shared Money
-- Run in the Supabase SQL editor for the project connected to this deployment.
create extension if not exists pgcrypto;

create table if not exists public.shared_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  currency text not null default 'NGN' check (currency in ('NGN','USD','GBP','GHS','KES','EUR')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_members (
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists shared_members_user_idx on public.shared_members(user_id);

create table if not exists public.shared_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(email))
);
create index if not exists shared_invitations_email_idx on public.shared_invitations(email);

create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 140),
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'Other',
  expense_date date not null default current_date,
  paid_by uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists shared_expenses_space_date_idx on public.shared_expenses(space_id, expense_date desc);

create table if not exists public.shared_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.shared_expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);
create index if not exists shared_splits_expense_idx on public.shared_expense_splits(expense_id);

create table if not exists public.shared_settlements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  payer_id uuid not null references auth.users(id),
  payee_id uuid not null references auth.users(id),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  settled_on date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (payer_id <> payee_id)
);
create index if not exists shared_settlements_space_date_idx on public.shared_settlements(space_id, settled_on desc);

create or replace function public.is_shared_member(target_space uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.shared_members m where m.space_id = target_space and m.user_id = target_user); $$;

create or replace function public.shared_expense_space(target_expense uuid)
returns uuid language sql stable security definer set search_path = public
as 'select e.space_id from public.shared_expenses e where e.id = target_expense';

create or replace function public.is_space_creator(target_space uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as 'select exists (select 1 from public.shared_spaces s where s.id = target_space and s.created_by = target_user)';

create or replace function public.is_member_email(target_space uuid, target_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.shared_members m where m.space_id = target_space and m.user_id = target_user); $$;

alter table public.shared_spaces enable row level security;
alter table public.shared_members enable row level security;
alter table public.shared_invitations enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.shared_expense_splits enable row level security;
alter table public.shared_settlements enable row level security;

drop policy if exists "Members can read their shared spaces" on public.shared_spaces;
create policy "Members can read their shared spaces" on public.shared_spaces for select to authenticated using (public.is_shared_member(id));
drop policy if exists "Authenticated users can create a space" on public.shared_spaces;
create policy "Authenticated users can create a space" on public.shared_spaces for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Space owners can update spaces" on public.shared_spaces;
create policy "Space owners can update spaces" on public.shared_spaces for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "Space owners can delete spaces" on public.shared_spaces;
create policy "Space owners can delete spaces" on public.shared_spaces for delete to authenticated using (created_by = auth.uid());

drop policy if exists "Members can view member list" on public.shared_members;
create policy "Members can view member list" on public.shared_members for select to authenticated using (public.is_shared_member(space_id));
drop policy if exists "Owners or accepted invitees can join" on public.shared_members;
create policy "Owners or accepted invitees can join" on public.shared_members for insert to authenticated with check (
  user_id = auth.uid()
  and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  and (
    public.is_space_creator(space_id, auth.uid())
    or exists (select 1 from public.shared_invitations i where i.space_id = shared_members.space_id and i.email = lower(coalesce(auth.jwt() ->> 'email', '')) and i.accepted_by = auth.uid() and i.accepted_at is not null)
  )
);
drop policy if exists "Members can leave a space" on public.shared_members;
create policy "Members can leave a space" on public.shared_members for delete to authenticated using (user_id = auth.uid() and role <> 'owner');

drop policy if exists "Members and invitees can view invitations" on public.shared_invitations;
create policy "Members and invitees can view invitations" on public.shared_invitations for select to authenticated using (
  email = lower(coalesce(auth.jwt() ->> 'email', '')) or (invited_by = auth.uid() and public.is_shared_member(space_id))
);
drop policy if exists "Members can create invitations" on public.shared_invitations;
create policy "Members can create invitations" on public.shared_invitations for insert to authenticated with check (
  invited_by = auth.uid() and public.is_shared_member(space_id) and email = lower(email)
);
drop policy if exists "Invitee can accept own invitation" on public.shared_invitations;
create policy "Invitee can accept own invitation" on public.shared_invitations for update to authenticated using (
  email = lower(coalesce(auth.jwt() ->> 'email', '')) and accepted_at is null
) with check (
  email = lower(coalesce(auth.jwt() ->> 'email', '')) and accepted_by = auth.uid() and accepted_at is not null
);

drop policy if exists "Members can view shared expenses" on public.shared_expenses;
create policy "Members can view shared expenses" on public.shared_expenses for select to authenticated using (public.is_shared_member(space_id));
drop policy if exists "Members can add shared expenses" on public.shared_expenses;
create policy "Members can add shared expenses" on public.shared_expenses for insert to authenticated with check (
  created_by = auth.uid() and public.is_shared_member(space_id) and public.is_shared_member(space_id, paid_by)
);
drop policy if exists "Creators can edit shared expenses" on public.shared_expenses;
create policy "Creators can edit shared expenses" on public.shared_expenses for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid() and public.is_shared_member(space_id));
drop policy if exists "Creators can delete shared expenses" on public.shared_expenses;
create policy "Creators can delete shared expenses" on public.shared_expenses for delete to authenticated using (created_by = auth.uid());

drop policy if exists "Members can view expense splits" on public.shared_expense_splits;
create policy "Members can view expense splits" on public.shared_expense_splits for select to authenticated using (public.is_shared_member(public.shared_expense_space(expense_id)));
drop policy if exists "Expense creator can add member splits" on public.shared_expense_splits;
create policy "Expense creator can add member splits" on public.shared_expense_splits for insert to authenticated with check (
  exists (select 1 from public.shared_expenses e where e.id = expense_id and e.created_by = auth.uid())
  and public.is_shared_member(public.shared_expense_space(expense_id), user_id)
);
drop policy if exists "Expense creator can edit splits" on public.shared_expense_splits;
create policy "Expense creator can edit splits" on public.shared_expense_splits for update to authenticated using (
  exists (select 1 from public.shared_expenses e where e.id = expense_id and e.created_by = auth.uid())
) with check (public.is_shared_member(public.shared_expense_space(expense_id), user_id));
drop policy if exists "Expense creator can remove splits" on public.shared_expense_splits;
create policy "Expense creator can remove splits" on public.shared_expense_splits for delete to authenticated using (
  exists (select 1 from public.shared_expenses e where e.id = expense_id and e.created_by = auth.uid())
);

drop policy if exists "Members can view settlements" on public.shared_settlements;
create policy "Members can view settlements" on public.shared_settlements for select to authenticated using (public.is_shared_member(space_id));
drop policy if exists "Members can record settlements" on public.shared_settlements;
create policy "Members can record settlements" on public.shared_settlements for insert to authenticated with check (
  created_by = auth.uid() and payer_id = auth.uid() and public.is_shared_member(space_id) and public.is_shared_member(space_id, payee_id)
);
drop policy if exists "Settlement creator can remove settlement" on public.shared_settlements;
create policy "Settlement creator can remove settlement" on public.shared_settlements for delete to authenticated using (created_by = auth.uid());

grant select, insert, update, delete on public.shared_spaces, public.shared_members, public.shared_invitations, public.shared_expenses, public.shared_expense_splits, public.shared_settlements to authenticated;

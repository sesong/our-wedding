-- Run this once in the Supabase SQL Editor.
-- The publishable key may be used in the browser; never put a secret key there.

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  message text not null check (char_length(btrim(message)) between 2 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.guestbook_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  attending boolean not null,
  party_size smallint not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  check ((attending and party_size between 1 and 8) or (not attending and party_size = 0))
);

create index if not exists guestbook_entries_public_order
  on public.guestbook_entries (created_at desc)
  where status = 'approved';

alter table public.guestbook_entries enable row level security;
alter table public.guestbook_admins enable row level security;
alter table public.rsvp_responses enable row level security;

revoke all on table public.guestbook_entries from anon, authenticated;
revoke all on table public.guestbook_admins from anon, authenticated;
revoke all on table public.rsvp_responses from anon, authenticated;

-- Guests can see only approved rows and submit only the two text fields.
grant select (id, name, message, created_at) on public.guestbook_entries to anon;
grant insert (name, message) on public.guestbook_entries to anon;

-- Signed-in users still need to pass the moderator RLS policy below.
grant select on public.guestbook_entries to authenticated;
grant update (status, reviewed_at) on public.guestbook_entries to authenticated;
grant select (user_id) on public.guestbook_admins to authenticated;

-- Guests can submit responses but can never read them through the public API.
grant insert (name, attending, party_size, note) on public.rsvp_responses to anon;
grant select on public.rsvp_responses to authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_guestbook_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guestbook_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_guestbook_admin() from public;
grant execute on function private.is_guestbook_admin() to authenticated;

drop policy if exists "Guests see approved entries" on public.guestbook_entries;
create policy "Guests see approved entries"
on public.guestbook_entries for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Guests submit pending entries" on public.guestbook_entries;
create policy "Guests submit pending entries"
on public.guestbook_entries for insert
to anon
with check (status = 'pending');

drop policy if exists "Moderators see all entries" on public.guestbook_entries;
create policy "Moderators see all entries"
on public.guestbook_entries for select
to authenticated
using ((select private.is_guestbook_admin()));

drop policy if exists "Moderators change visibility" on public.guestbook_entries;
create policy "Moderators change visibility"
on public.guestbook_entries for update
to authenticated
using ((select private.is_guestbook_admin()))
with check ((select private.is_guestbook_admin()));

drop policy if exists "Moderators see own membership" on public.guestbook_admins;
create policy "Moderators see own membership"
on public.guestbook_admins for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Guests submit RSVP responses" on public.rsvp_responses;
create policy "Guests submit RSVP responses"
on public.rsvp_responses for insert
to anon
with check (true);

drop policy if exists "Moderators see RSVP responses" on public.rsvp_responses;
create policy "Moderators see RSVP responses"
on public.rsvp_responses for select
to authenticated
using ((select private.is_guestbook_admin()));

-- Create the Auth user for kimsesong@gmail.com before running this statement.
insert into public.guestbook_admins (user_id)
select id from auth.users where email = 'kimsesong@gmail.com'
on conflict do nothing;

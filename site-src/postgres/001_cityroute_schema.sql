-- CityRoute PostgreSQL 17 / existing Supabase project.
-- Reuses pre-existing public.profiles/routes/favorites/friend_requests.
-- Does NOT replace or delete existing tables, policies, users or data.
-- Personal routes/settings remain private by row-level security.
-- GPS is uploaded only after a user explicitly saves a walk while signed in.

-- Bring existing saved routes up to the current full JSON route representation.
alter table public.routes
    add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.routes
    add column if not exists updated_at timestamptz not null default now();
create index if not exists routes_owner_recent_idx
    on public.routes(owner_id, updated_at desc);
-- Existing owner-only SELECT, INSERT, DELETE policies are retained.
drop policy if exists "routes own update" on public.routes;
create policy "routes own update" on public.routes for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

-- Existing favourite coordinates/name/category remain intact.
alter table public.favorites
    add column if not exists place_id text;
create unique index if not exists favorites_owner_place_id_idx
    on public.favorites(owner_id, place_id) where place_id is not null;

-- Private language, theme and preferences (no location tracking).
create table if not exists public.cityroute_settings (
    owner_id uuid primary key references auth.users(id) on delete cascade,
    theme text not null default 'light' check (theme in ('light', 'dark')),
    language text not null default 'ru' check (language in ('ru', 'en')),
    home_city text not null default 'Москва' check (char_length(home_city) between 1 and 120),
    preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
    updated_at timestamptz not null default now()
);

-- Public read-only catalogue for search without relying on slow public APIs.
create table if not exists public.cityroute_places (
    id text primary key check (char_length(id) between 1 and 160),
    name text not null check (char_length(name) between 1 and 240),
    city text not null default 'Москва',
    type text not null check (char_length(type) between 1 and 40),
    category text not null check (char_length(category) between 1 and 40),
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    address text,
    wikipedia text,
    verified_at timestamptz
);
create index if not exists cityroute_places_city_type_idx
    on public.cityroute_places(city, type);
create index if not exists cityroute_places_lat_lng_idx
    on public.cityroute_places(latitude, longitude);

alter table public.routes enable row level security;
alter table public.favorites enable row level security;
alter table public.cityroute_settings enable row level security;
alter table public.cityroute_places enable row level security;

-- Explicit Data API privileges, always paired with owner-only RLS.
grant select, insert, update, delete on public.routes to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
revoke all on public.cityroute_settings from anon, authenticated;
revoke all on public.cityroute_places from anon, authenticated;
grant select, insert, update, delete on public.cityroute_settings to authenticated;
grant select on public.cityroute_places to anon, authenticated;

drop policy if exists cityroute_settings_select_own on public.cityroute_settings;
create policy cityroute_settings_select_own on public.cityroute_settings
    for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists cityroute_settings_insert_own on public.cityroute_settings;
create policy cityroute_settings_insert_own on public.cityroute_settings
    for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_settings_update_own on public.cityroute_settings;
create policy cityroute_settings_update_own on public.cityroute_settings
    for update to authenticated using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_settings_delete_own on public.cityroute_settings;
create policy cityroute_settings_delete_own on public.cityroute_settings
    for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists cityroute_places_public_read on public.cityroute_places;
create policy cityroute_places_public_read on public.cityroute_places
    for select to anon, authenticated using (true);

comment on column public.routes.payload is 'Complete walking itinerary, stored only when the user presses Save while signed in.';
comment on table public.cityroute_settings is 'User-owned UI preferences; never automatically contains GPS.';
comment on table public.cityroute_places is 'Public city catalogue; no user or GPS history.';

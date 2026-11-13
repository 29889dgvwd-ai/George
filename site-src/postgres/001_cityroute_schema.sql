-- CityRoute PostgreSQL 17 / Supabase schema.
-- The previous Cloudflare D1 (SQLite) tables remain untouched.
-- All personal routes, favourites and settings are protected by owner-only RLS.
-- Precise GPS coordinates are never collected automatically by this migration.

create table if not exists public.cityroute_routes (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Моя прогулка' check (char_length(title) between 1 and 160),
    city text not null default 'Москва' check (char_length(city) between 1 and 120),
    route jsonb not null check (jsonb_typeof(route) = 'object' and octet_length(route::text) <= 350000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists cityroute_routes_owner_recent_idx
    on public.cityroute_routes(owner_id, updated_at desc);

create table if not exists public.cityroute_favorites (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    place_id text not null check (char_length(place_id) between 1 and 160),
    name text not null check (char_length(name) between 1 and 240),
    category text not null default 'sights' check (char_length(category) between 1 and 40),
    latitude double precision check (latitude between -90 and 90),
    longitude double precision check (longitude between -180 and 180),
    created_at timestamptz not null default now(),
    constraint cityroute_favorites_unique_place unique (owner_id, place_id)
);
create index if not exists cityroute_favorites_owner_idx
    on public.cityroute_favorites(owner_id, created_at desc);

create table if not exists public.cityroute_settings (
    owner_id uuid primary key references auth.users(id) on delete cascade,
    theme text not null default 'light' check (theme in ('light', 'dark')),
    language text not null default 'ru' check (language in ('ru', 'en')),
    home_city text not null default 'Москва' check (char_length(home_city) between 1 and 120),
    preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
    updated_at timestamptz not null default now()
);

-- Public place catalogue does NOT contain personal location history.
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

alter table public.cityroute_routes enable row level security;
alter table public.cityroute_favorites enable row level security;
alter table public.cityroute_settings enable row level security;
alter table public.cityroute_places enable row level security;

revoke all on public.cityroute_routes from anon, authenticated;
revoke all on public.cityroute_favorites from anon, authenticated;
revoke all on public.cityroute_settings from anon, authenticated;
revoke all on public.cityroute_places from anon, authenticated;
grant select, insert, update, delete on public.cityroute_routes to authenticated;
grant select, insert, update, delete on public.cityroute_favorites to authenticated;
grant select, insert, update, delete on public.cityroute_settings to authenticated;
grant select on public.cityroute_places to anon, authenticated;

drop policy if exists cityroute_routes_select_own on public.cityroute_routes;
create policy cityroute_routes_select_own on public.cityroute_routes
    for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists cityroute_routes_insert_own on public.cityroute_routes;
create policy cityroute_routes_insert_own on public.cityroute_routes
    for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_routes_update_own on public.cityroute_routes;
create policy cityroute_routes_update_own on public.cityroute_routes
    for update to authenticated using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_routes_delete_own on public.cityroute_routes;
create policy cityroute_routes_delete_own on public.cityroute_routes
    for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists cityroute_favorites_select_own on public.cityroute_favorites;
create policy cityroute_favorites_select_own on public.cityroute_favorites
    for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists cityroute_favorites_insert_own on public.cityroute_favorites;
create policy cityroute_favorites_insert_own on public.cityroute_favorites
    for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_favorites_update_own on public.cityroute_favorites;
create policy cityroute_favorites_update_own on public.cityroute_favorites
    for update to authenticated using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
drop policy if exists cityroute_favorites_delete_own on public.cityroute_favorites;
create policy cityroute_favorites_delete_own on public.cityroute_favorites
    for delete to authenticated using ((select auth.uid()) = owner_id);

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

comment on table public.cityroute_routes is 'User-initiated CityRoute saved walking itineraries. No automatic GPS uploads.';
comment on table public.cityroute_favorites is 'User-owned favourite places.';
comment on table public.cityroute_settings is 'User-owned UI preferences.';
comment on table public.cityroute_places is 'Public Moscow places catalogue: no user information.';

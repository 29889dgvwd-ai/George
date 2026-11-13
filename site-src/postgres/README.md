# CityRoute · PostgreSQL 17

CityRoute uses the existing Supabase project **CityRoute**, deployed in the EU (Frankfurt, `eu-central-1`), as its **real PostgreSQL database**. The static website remains hosted from `docs/` in this repository.

## Production database

- PostgreSQL project reference: `nueldyadzypealriurmu`
- Supabase dashboard: https://supabase.com/dashboard/project/nueldyadzypealriurmu/editor
- Schema SQL: `001_cityroute_schema.sql`
- Public place catalogue: `002_cityroute_places_seed.sql`
- Browser client: `../public/postgres-client.js`
- Account / cloud UI: `../public/postgres-ui.js`

The schema migration has **already been applied** to the live project and the catalogue has **90 reference places** for Moscow.

### Database tables

| Table | Purpose | Read access | Write access |
| --- | --- | --- | --- |
| `public.routes` | Complete saved routes as `payload JSONB`, plus summary columns | Signed-in owner only | Signed-in owner only |
| `public.favorites` | Bookmarked place names, category, coordinates | Signed-in owner only | Signed-in owner only |
| `public.cityroute_settings` | Language, theme, home city, UI preferences | Signed-in owner only | Signed-in owner only |
| `public.cityroute_places` | 90 public Moscow reference places | Everyone | Database administrators only |
| `public.profiles` | Existing account profiles | As configured in the pre-existing DB | As configured in the pre-existing DB |
| `public.friend_requests` | Existing friendship requests | Participants only | According to its existing RLS policies |

All personal tables use PostgreSQL **Row Level Security**. This protects each user's routes from unrelated accounts. The pre-existing tables and policies were not removed.

### Using the live website

1. Open CityRoute. Its map and local route planner work **without signing in**.
2. Open **☁ Облако PostgreSQL**.
3. Register with your email/password (and confirm email if prompted), or sign in.
4. Build a route and click **♡ Сохранить прогулку**. It saves on this device and, if signed in, in PostgreSQL.
5. **↑ Перенести мои маршруты в облако** uploads existing local walks, only after the button is clicked.
6. **↻ Загрузить из PostgreSQL** loads cloud routes on another device, while **Сохранить настройки** saves your selected theme/language/preferences.

A user's GPS location is **never uploaded automatically**. A route containing coordinates is sent only after the user explicitly saves or synchronizes it.

### Configuration and security

The public website includes only the project's **publishable** API key. **Do not commit** a `sb_secret_` key, database password, or an old `service_role` key.

Authentication is handled by Supabase Auth over HTTPS. Database access is through PostgreSQL's row-level policies and the Supabase REST API. Local browsing and local saved routes continue to work if PostgreSQL is temporarily unavailable or a free database is paused.

The existing Cloudflare/D1 app code under `site-src/server/` has **not** been automatically migrated to PostgreSQL. The published static edition uses PostgreSQL for saved routes, favorites, settings, and public places; account-based friends/events in the older D1 backend are a separate feature.

### Verification

- `site-src/tests/postgres-live.mjs` verifies that the real public PostgreSQL API returns catalog places and that anonymous users cannot read personal routes/settings.
- `site-src/tests/yandex-browser.mjs` exercises the mobile UI, geolocation, route building, selected places and local persistence.

When replaying these migrations on another Supabase project, first inspect its existing tables and policies. The schema migration intentionally reuses this project's pre-existing `routes`/`favorites` tables.

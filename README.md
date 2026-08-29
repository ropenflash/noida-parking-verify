# Noida Parking Verify

Evidence-based parking verification and reporting for **Noida, Uttar Pradesh**. This is not a booking app and **not a legal determination**.

The app helps a person standing at a collection point record location, photos, operator, payment, and receipt details, then compare that evidence with sourced authority records.

Seeded authority rows are marked **DEMO DATA**. Do not present them as live official extracts.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Postgres + PostGIS, Auth, Storage, RLS)
- PWA (manifest + service worker + offline draft queue)
- Zod validation and a pure TypeScript verification engine

## Local setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (for example `http://localhost:3000`)

   Never put a service-role key in `NEXT_PUBLIC_*` variables.

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Supabase

A dedicated project should be used (do not mix this schema into an unrelated database).

### Apply schema

The full schema lives in `supabase/migrations/20260829120000_init.sql`. Demo rows are in `supabase/seed.sql`.

With the Supabase CLI (linked project):

```bash
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Or run those SQL files in the Supabase SQL editor.

The schema enables PostGIS, RLS, storage buckets `evidence` and `authority-documents`, and RPCs:

- `find_nearby_parking_sites(lat, long, radius_m)`
- `find_nearby_public_reports(lat, long, radius_m)`

### Auth and roles

Roles live on `profiles.role`: `USER`, `MODERATOR`, `ADMIN`. They are **not** taken from user-editable metadata.

After you create the first account, promote it in the SQL editor:

```sql
update public.profiles
set role = 'ADMIN'
where id = '<auth user uuid>';
```

If email confirmation is enabled, confirm the user in the Auth dashboard or disable confirmation for development.

### Storage

Evidence uploads go to `evidence/{user_id}/...`. Users can only write into their own folder. Staff can read evidence for review. Authority documents are readable by signed-in users and writable by staff.

## Verification engine

Scoring is configurable in `verification_config`. The TypeScript engine in `src/lib/verification/engine.ts` produces an **internal evidence score**, not a legal finding.

Important rule: a personal UPI recipient (for example “Arvind Yadav”) is **not** treated as proof of unauthorised collection. That case classifies as **Needs verification**.

Overcharging is only applied when there is an **exact** site match and a sourced approved rate.

## Tests

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

SQL notes for RLS checks are in `supabase/tests/rls.sql`.

## PWA

- Manifest: `src/app/manifest.ts`
- Service worker: `public/sw.js`
- Offline page: `/offline` and `public/offline.html`

On Android Chrome: open the deployed HTTPS URL → menu → **Install app**.

On iOS Safari: Share → **Add to Home Screen**.

If you submit while offline, the UI stores a draft on the device and shows **Saved on this device — waiting for connection**. That draft is not treated as submitted to Supabase.

## Vercel

1. Import the Git repository in Vercel.
2. Set the same environment variables as `.env.example`.
3. Deploy. `npm run build` is the production build.

## Legal wording

The product uses phrases such as “evidence suggests”, “could not verify”, and “potentially unauthorised”. It does not label a person as a criminal, fraudster, or thief.

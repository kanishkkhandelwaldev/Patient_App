# Platform Integration — Patient App ↔ Portals ↔ Supabase

This repo now contains **two clients that share one backend**:

| Client | Path | Stack |
|---|---|---|
| Patient app | `/` (repo root) | Expo / React Native |
| Caregiver + Doctor portal (Niramaya) | `/web-portal` | Vite / React |
| Backend | Supabase (Postgres + Realtime + Storage) | `supabase/schema.sql` |

When the backend is **not** configured, both clients fall back to their original
local demo data and still run — so nothing is broken while you set Supabase up.

---

## 1. One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query →** paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   It is idempotent (safe to re-run) and creates every table, RLS policy,
   realtime subscription, the `family-photos` storage bucket, and seed data.
3. **Then run [`supabase/migration_cognitive.sql`](supabase/migration_cognitive.sql)** the same way —
   it adds the per-session clinical metrics (`reaction_ms`, `error_rate`, `abandoned`,
   `adaptive_threshold`, `domain`, `source`) to `game_results` and seeds ~90 days of
   history so the **Cognitive Report** charts render.
4. **Project Settings → API** — copy:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon / public** key (the long `eyJ…` one — *not* `service_role`)

### Seed / demo credentials

| | Value |
|---|---|
| Patient access code | `KAML-1234` |
| Patient PIN | `KAML1234` (caregiver code `1234` also works in Settings) |
| Doctor access code | `DRSH-2024` |

---

## 2. Wire the keys

### Patient app — `/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```
Restart Expo (`npm start`) — env vars are inlined at build time.

### Portal — `/web-portal/.env`
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```
Restart `npm run dev`.

Both `.env` files are git-ignored; `.env.example` is committed.

---

## 3. How the sync works

### Data model
`supabase/schema.sql` is the single source of truth. Key tables:

- `patients` — profile, streak, milestone, `family_photo_url`, `next_appointment` (doctor-set)
- `reminders`, `tasks`, `contacts` — caregiver-managed, delivered by the app
- `appointments` — the caregiver's richer day schedule (portal Reminder Vault)
- `memories` — Memory Vault cards + uploaded photos
- `game_results` (one per session) + `game_progress` (current adaptive level) + `daily_records` (per-day summary)
- `community_posts` — shared across all three roles; `status` (moderation) + `patient_visible` (surfaced in the app)
- `doctors` — each has its own access code

### Patient app (`state/AppContext.tsx`)
The reducer is still the on-device source of truth. On top of it:

- **Inbound** — on sign-in it calls `lib/remote.ts::fetchBundle(accessCode)` (or
  `createPatient` for a new account), merges the result via `REMOTE_MERGE`, then
  `subscribe()`s to realtime. Caregiver/doctor edits arrive as `postgres_changes`
  and re-merge automatically.
- **Outbound** — `dispatch` is wrapped: game results, task toggles, reminder acks,
  streak/milestone changes and profile edits become `RemoteOp`s
  (`lib/outbox.ts`). Online → written immediately. Offline → persisted to
  AsyncStorage and flushed by the `flushOutbox()` effect when connectivity
  returns (spec §20).
- With no env vars, `isRemote` is `false` and none of this runs.

### Portal
- `context/PatientProvider.jsx` — connects a session to one patient by access
  code (caregiver) or doctor code (doctor), and keeps the `patients` row live.
- `lib/useCollection.js` — a hook giving each view a live, realtime-synced list
  for one table (`reminders`, `tasks`, `memories`, `appointments`, …) with
  `insert` / `update` / `remove`.
- `lib/api.js` — all other queries (community, performance, photo upload, doctor).

### End-to-end flows you can demo

| Action | Path |
|---|---|
| Caregiver adds a reminder | Portal → `reminders` insert → realtime → app Alerts / in-game overlay |
| Patient acknowledges a reminder | App → `reminders.acknowledged` → realtime → portal Dashboard shows "Done" |
| Patient finishes a game set | App → `game_results` + `game_progress` + `daily_records` → portal graphs + Doctor view |
| Doctor sets next appointment | Doctor portal → `patients.next_appointment` → realtime → app Home chip / Alerts + caregiver Dashboard |
| Caregiver uploads a family photo | Portal Memory Vault → Storage + `patients.family_photo_url` → app Memory Chest |
| Caregiver writes a community post | Portal → `community_posts` (pending) → moderate → mark *patient-visible* → app Community |

---

## 4. Security posture (important)

The platform uses **access-code auth over the anon key** — there are no Supabase
Auth users. RLS is **enabled** but with permissive `demo_all` policies: anyone
with the anon key can read/write any row. **This is fine for a hackathon demo,
not for production.**

To harden later:
1. Add Supabase Auth (email/password + Google) for patients; issue caregiver/
   doctor logins too.
2. Store `auth.uid()` on `patients` / `caregivers` / `doctors`.
3. Replace each `demo_all` policy with a scoped one, e.g.
   `using (patient_id in (select patient_id from caregivers where user_id = auth.uid()))`.
4. Move `pin` to a hash, and restrict the doctor's column access with a view.

---

## 5. Files added / changed

**Backend**
- `supabase/schema.sql` — the whole schema + seed

**Patient app**
- `lib/supabase.ts`, `lib/remote.ts`, `lib/outbox.ts` — new
- `state/AppContext.tsx` — `patientId`, `REMOTE_MERGE`/`SET_PATIENT_ID`/`SYNC_NOTE`,
  dispatch wrapper, sync + outbox effects
- `.env` / `.env.example`, `package.json` (`@supabase/supabase-js`, `react-native-url-polyfill`)

**Portal**
- `src/lib/supabase.js`, `src/lib/api.js`, `src/lib/useCollection.js` — new
- `src/context/PatientProvider.jsx` — new
- `src/App.jsx`, `src/components/nirmaya/{LoginScreen,AppShell,Sidebar,SOSOverlay}.jsx` — connection-aware
- `src/components/nirmaya/{DashboardView,ReminderVault,MemoryVault,Community,AppSettings,PathwayProgress,TrendChart}.jsx` — backend-backed
- `src/components/nirmaya/DoctorView.jsx` — new (doctor role)
- `.env` / `.env.example`, `package.json` (`@supabase/supabase-js`)

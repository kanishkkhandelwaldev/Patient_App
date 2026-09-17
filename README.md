# Niramaya — Patient App

Prototype of the **patient application** from the Dementia Support Platform
spec, built for a judge demo. Expo / React Native, runs on web, iOS and
Android from one codebase.

**Backend:** an optional shared Supabase backend connects this app to the
Caregiver + Doctor portal in [`web-portal/`](web-portal/). Set
`EXPO_PUBLIC_SUPABASE_*` in `.env` and edits sync live between the two
(see [`INTEGRATION.md`](INTEGRATION.md)). With no keys set, the app runs exactly
as before — fully local, `state/AppContext.tsx` as the in-app "central backend"
persisted to local storage, plus the **Presenter Controls** panel in Settings.

## Run it

```bash
npm install
npm start        # then press w for web, a for Android, i for iOS
npm run web      # open directly in a browser
```

`App.tsx` boots to **Auth → Setup wizard → Home** on first run, and straight to
**Home** on later runs (state is remembered). Bottom nav: Home / Games / Tasks /
SOS / Settings. Progress, Community Stories and Memory Chest open from Home.

### Demoing it

- On the Auth screen, **"Skip to a populated demo patient"** jumps past
  onboarding into a seeded account (patient "Kamala", 6-day streak, Assam /
  Assamese pack, reminders, appointment).
- **Settings → Demo / Presenter Controls** (PIN `1234` on the seeded patient;
  the same `1234` opens "View My Progress" for the caregiver):
  go offline / online, fire a reminder, complete today's set, advance a day,
  set the family photo, reset.

## Spec coverage (patient-facing sections)

| Spec | Where |
|---|---|
| §3 Auth (sign up / in / Google) | `app/AuthScreen.tsx` (mock) |
| §4 Setup — patient, caregiver, PIN, avatar, optional photo | `app/PatientSetupScreen.tsx` (7 steps) |
| §5 Regional + language content pack | pack "download" with progress bar in setup; badge + localized greeting on Home; `CONTENT_PACKS` in `data/mock.ts` |
| §6 Access code + PIN (reuse or custom) | setup step 4 |
| §7 Home, Duolingo-style nav | `app/HomeScreen.tsx`, `components/BottomNav.tsx` |
| §8 Start with 4 games, unlock to 8 | `data/games.ts` `unlockedGameCount()` |
| §9 3 levels per session, per-game stats | `app/GamePlayScreen.tsx` |
| §10 Adaptive difficulty, level persists across days | `GamePlayScreen` + `RECORD_GAME_RESULT` |
| §11 Avatar moves along the trail | `components/AvatarTrail.tsx` (animated) |
| §12 Memory Chest — photo + recall questionnaire | `app/MemoryChestScreen.tsx` |
| §13 Eight cognitive games | 6 playable — **Memory Flip** & **Northeast Trails** (Flow-Free) run in a full "Northeast" game shell (`components/GameShell.tsx`); Sequence Recall, Pattern Recognition, Rule Switch, Picture Detection; 2 are honest "coming soon" that still advance the set |
| §14 More Games (locked until daily set done) | `app/MoreGamesScreen.tsx` |
| §15 Tasks / routine | `app/TasksScreen.tsx` |
| §16 SOS / Contacts (call / SMS / WhatsApp) | `app/SOSScreen.tsx` |
| §17 PIN-gated settings + offline caregiver override | `app/SettingsScreen.tsx` |
| §18 Reminder delivery — game pauses, avatar speaks, resume | `components/ReminderOverlay.tsx` (auto-fires ~8s into a game; also fireable from Home / presenter) |
| §19 Pre-downloaded offline content | meter in Settings (`preDownloadedDays`) |
| §20 Offline edits queue + sync log | `pendingSync` + `syncLog` in Settings, spinner on reconnect |
| §24 Approved, patient-suitable community content | `app/CommunityScreen.tsx` — ranked by engagement (`rankScore`), moderation banner, appreciation tap |
| §25.3 Doctor-set next appointment | chip on Home, `nextAppointment` seed |

## Deliberately not real (prototype)

- **Backend is optional.** Without `EXPO_PUBLIC_SUPABASE_*`, auth/sync and
  caregiver/doctor data are local mocks in `state/AppContext.tsx`. With Supabase
  configured, the app syncs live with the portal (`INTEGRATION.md`), but auth is
  still access-code based (no passwords) and RLS uses permissive demo policies.
- **2 of 8 games** (Jigsaw, Musical Sequence) are "coming soon"
  screens that still complete the daily set.
- **Reminders** use a demo trigger, not real OS notification scheduling.
- **Sample family photos** are drawn SVGs; real uploads go through
  `expo-image-picker` (browser file input on web).
- **Presenter Controls** in Settings are a demo aid, not a shipped feature.

## Deploy the web build (EAS Hosting)

```bash
npx eas-cli login          # your Expo account (one-time)
npx eas-cli init           # links the project (one-time)
npm run deploy             # expo export -p web + eas deploy
```

First `deploy` prompts for a subdomain and prints a `https://<name>.expo.app`
URL. `npx eas-cli deploy --prod` promotes to the production alias.

## Where to extend next

- `data/games.ts` / `games/*.tsx` — one file per game, `level` in →
  `onComplete({accuracy, leveledUp})` out.
- `state/AppContext.tsx` — single source of truth; swap reducer actions for
  real API calls when the backend exists.

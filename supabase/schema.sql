-- ============================================================================
--  SmritiSetu / SIH Dementia Support Platform — Supabase schema
--
--  HOW TO USE
--    1. Open your Supabase project → SQL Editor → New query
--    2. Paste this entire file and press "Run"
--    3. It is idempotent — safe to run again after edits
--
--  WHAT IT CREATES
--    - All platform tables (patients, caregivers, doctors, reminders, tasks,
--      contacts, memories, game_results, game_progress, daily_records,
--      appointments, community_posts, content_packs)
--    - Row Level Security with permissive demo policies (see SECURITY note)
--    - Realtime enabled on the tables the apps subscribe to
--    - A public Storage bucket "family-photos" for caregiver photo uploads
--    - Seed data: demo patient "Kamala" (access code KAML-1234),
--      her doctor (doctor access code DRSH-2024), reminders, tasks, contacts,
--      community posts, content packs and a week of progress history
--
--  SECURITY NOTE (read before production)
--    This platform uses "access-code" auth: the mobile app and the web portals
--    talk to Supabase with the public anon key and identify a patient by their
--    access code. There are no Supabase Auth users. RLS is therefore ENABLED
--    with permissive policies (anyone with the anon key can read/write every
--    row). That is acceptable for a hackathon demo but NOT for production —
--    for production, introduce Supabase Auth and replace the `demo_all`
--    policies with `auth.uid()`-scoped policies. See INTEGRATION.md.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
--  updated_at helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
--  content_packs — regional / language content packs (spec §5)
-- ----------------------------------------------------------------------------
create table if not exists content_packs (
  id       bigint generated always as identity primary key,
  region   text not null,
  language text not null,
  greeting text not null default 'Namaste',
  size_mb  integer not null default 32,
  unique (region, language)
);

-- ----------------------------------------------------------------------------
--  patients — the single source of truth for one patient account
-- ----------------------------------------------------------------------------
create table if not exists patients (
  id               uuid primary key default gen_random_uuid(),
  access_code      text unique not null,
  name             text not null default '',
  caregiver_name   text not null default '',
  region           text not null default '',
  language         text not null default '',
  avatar           text,                                   -- 'aita' | 'koka'
  pin              text not null default '',               -- local-authorization PIN (§6/§17). Demo: plain text.
  streak           integer not null default 0,
  milestone        integer not null default 0,             -- completed daily sets → drives game unlocking (§8)
  family_photo_url text,                                    -- current Memory Chest photo (§12)
  next_appointment jsonb,                                   -- { date, doctorName, hospital } — set by the doctor (§25.3)
  content_pack     jsonb,                                   -- { region, language, greeting, sizeMb, status, progress }
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists patients_updated_at on patients;
create trigger patients_updated_at before update on patients
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
--  caregivers (spec §21)
-- ----------------------------------------------------------------------------
create table if not exists caregivers (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name       text not null default '',
  relation   text not null default 'Primary caregiver',
  phone      text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists caregivers_patient_idx on caregivers(patient_id);

-- ----------------------------------------------------------------------------
--  doctors (spec §21.5, §25) — a doctor is reached via their own access code
-- ----------------------------------------------------------------------------
create table if not exists doctors (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  name        text not null default '',
  hospital    text not null default '',
  access_code text unique not null,
  created_at  timestamptz not null default now()
);
create index if not exists doctors_patient_idx on doctors(patient_id);

-- ----------------------------------------------------------------------------
--  reminders (spec §18) — configured by caregiver/doctor, delivered by the app
-- ----------------------------------------------------------------------------
create table if not exists reminders (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  kind         text not null default 'activity',    -- medication | appointment | activity
  title        text not null,
  time         text not null,                       -- display string, e.g. "5:00 PM"
  note         text,
  active       boolean not null default true,
  acknowledged boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists reminders_patient_idx on reminders(patient_id);
drop trigger if exists reminders_updated_at on reminders;
create trigger reminders_updated_at before update on reminders
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
--  tasks — the patient's daily routine (spec §15)
-- ----------------------------------------------------------------------------
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title      text not null,
  time       text not null default '',
  done       boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_patient_idx on tasks(patient_id);
drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
--  contacts — SOS / important contacts (spec §16)
-- ----------------------------------------------------------------------------
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name       text not null,
  relation   text not null default '',
  phone      text not null,
  category   text not null default 'family',        -- caregiver | family | doctor | emergency
  is_primary boolean not null default false,
  sort_order integer not null default 0
);
create index if not exists contacts_patient_idx on contacts(patient_id);

-- ----------------------------------------------------------------------------
--  memories — Memory Vault cards + family photos (spec §12, §21.2)
-- ----------------------------------------------------------------------------
create table if not exists memories (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title      text not null,
  location   text default '',
  date       date,
  tags       text[] not null default '{}',
  caption    text default '',
  image_url  text,
  created_at timestamptz not null default now()
);
create index if not exists memories_patient_idx on memories(patient_id);

-- ----------------------------------------------------------------------------
--  game_results — one row per completed game session (spec §9)
-- ----------------------------------------------------------------------------
create table if not exists game_results (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  game_id    text not null,
  accuracy   integer not null,
  level      integer not null default 1,
  leveled_up boolean not null default false,
  played_at  timestamptz not null default now()
);
create index if not exists game_results_patient_idx on game_results(patient_id, played_at desc);

-- ----------------------------------------------------------------------------
--  game_progress — current adaptive-difficulty state per game (spec §10)
-- ----------------------------------------------------------------------------
create table if not exists game_progress (
  patient_id     uuid not null references patients(id) on delete cascade,
  game_id        text not null,
  level          integer not null default 1,
  best_accuracy  integer not null default 0,
  last_played_at timestamptz,
  primary key (patient_id, game_id)
);

-- ----------------------------------------------------------------------------
--  daily_records — completed-set summary per day (spec §9, feeds portal graphs)
-- ----------------------------------------------------------------------------
create table if not exists daily_records (
  patient_id      uuid not null references patients(id) on delete cascade,
  date            date not null,
  games_completed integer not null default 0,
  avg_accuracy    integer not null default 0,
  primary key (patient_id, date)
);

-- ----------------------------------------------------------------------------
--  appointments — caregiver's daily task schedule (portal "Reminder Vault")
--  NOTE: the single doctor-set "Next Appointment" (§25.3) lives on
--  patients.next_appointment; this table is the richer day schedule.
-- ----------------------------------------------------------------------------
create table if not exists appointments (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title      text not null,
  time       text not null,                         -- "HH:MM" 24h
  type       text not null default 'Medical',       -- Medical | Therapy | Medication | Activity
  with_whom  text default '',
  location   text default '',
  status     text not null default 'upcoming',      -- upcoming | done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists appointments_patient_idx on appointments(patient_id);
drop trigger if exists appointments_updated_at on appointments;
create trigger appointments_updated_at before update on appointments
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
--  community_posts — caregiver/doctor knowledge sharing (spec §22–§24)
-- ----------------------------------------------------------------------------
create table if not exists community_posts (
  id              uuid primary key default gen_random_uuid(),
  author          text not null,
  author_role     text not null default 'caregiver',   -- caregiver | doctor
  patient_id      uuid references patients(id) on delete set null,
  title           text not null,
  body            text not null,
  excerpt         text,
  category        text not null default 'Experience',
  language        text not null default 'English',
  views           integer not null default 0,
  upvotes         integer not null default 0,
  comments        integer not null default 0,
  status          text not null default 'pending',     -- pending | approved | review | removed
  patient_visible boolean not null default false,      -- surfaced in the patient app (§24)
  created_at      timestamptz not null default now()
);
create index if not exists community_status_idx on community_posts(status, created_at desc);

-- ----------------------------------------------------------------------------
--  atomic counter helpers (so concurrent upvotes / views don't clobber)
-- ----------------------------------------------------------------------------
create or replace function community_bump(post_id uuid, field text, delta int)
returns void language plpgsql as $$
begin
  if field = 'upvotes' then
    update community_posts set upvotes = greatest(0, upvotes + delta) where id = post_id;
  elsif field = 'views' then
    update community_posts set views = greatest(0, views + delta) where id = post_id;
  elsif field = 'comments' then
    update community_posts set comments = greatest(0, comments + delta) where id = post_id;
  end if;
end $$;

-- ============================================================================
--  ROW LEVEL SECURITY  (permissive demo policies — see SECURITY NOTE above)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'content_packs','patients','caregivers','doctors','reminders','tasks',
    'contacts','memories','game_results','game_progress','daily_records',
    'appointments','community_posts'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_all on %I', t);
    execute format(
      'create policy demo_all on %I for all to anon, authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ============================================================================
--  REALTIME  (the apps subscribe to these tables)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'patients','reminders','tasks','appointments','memories',
    'contacts','community_posts','game_progress','daily_records','game_results'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================================
--  STORAGE  (family photo uploads from the caregiver portal)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', true)
on conflict (id) do nothing;

drop policy if exists "family-photos read"   on storage.objects;
drop policy if exists "family-photos insert" on storage.objects;
drop policy if exists "family-photos update" on storage.objects;
drop policy if exists "family-photos delete" on storage.objects;
create policy "family-photos read"   on storage.objects for select to anon, authenticated using (bucket_id = 'family-photos');
create policy "family-photos insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'family-photos');
create policy "family-photos update" on storage.objects for update to anon, authenticated using (bucket_id = 'family-photos');
create policy "family-photos delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'family-photos');

-- ============================================================================
--  SEED DATA
-- ============================================================================

-- content packs (mirrors data/mock.ts CONTENT_PACKS) ------------------------
insert into content_packs (region, language, greeting, size_mb) values
  ('Assam','Assamese','নমস্কাৰ',42),
  ('Assam','English','Namaste',30),
  ('West Bengal','Bengali','নমস্কার',45),
  ('West Bengal','English','Namaste',30),
  ('Maharashtra','Marathi','नमस्कार',40),
  ('Maharashtra','Hindi','नमस्ते',38),
  ('Kerala','Malayalam','നമസ്കാരം',44),
  ('Kerala','English','Namaste',30),
  ('Punjab','Punjabi','ਸਤ ਸ੍ਰੀ ਅਕਾਲ',41),
  ('Punjab','Hindi','नमस्ते',38),
  ('Tamil Nadu','Tamil','வணக்கம்',43),
  ('Tamil Nadu','English','Namaste',30)
on conflict (region, language) do nothing;

-- demo patient "Kamala" ----------------------------------------------------
insert into patients (access_code, name, caregiver_name, region, language, avatar, pin, streak, milestone, next_appointment, content_pack)
values (
  'KAML-1234', 'Kamala', 'Priya', 'Assam', 'Assamese', 'aita', 'KAML1234', 6, 1,
  jsonb_build_object('date','Mon 22 Sep, 11:30 AM','doctorName','Dr. Sharma','hospital','City Hospital, Guwahati'),
  jsonb_build_object('region','Assam','language','Assamese','greeting','নমস্কাৰ','sizeMb',42,'status','ready','progress',100)
)
on conflict (access_code) do nothing;

-- everything below is attached to that patient, guarded so re-runs don't duplicate
do $$
declare pid uuid;
begin
  select id into pid from patients where access_code = 'KAML-1234';

  -- caregiver
  if not exists (select 1 from caregivers where patient_id = pid) then
    insert into caregivers (patient_id, name, relation, phone)
    values (pid, 'Priya', 'Daughter', '+919800000001');
  end if;

  -- doctor  (Doctor Access Code: DRSH-2024)
  if not exists (select 1 from doctors where patient_id = pid) then
    insert into doctors (patient_id, name, hospital, access_code)
    values (pid, 'Dr. Sharma', 'City Hospital, Guwahati', 'DRSH-2024');
  end if;

  -- reminders (§18)
  if not exists (select 1 from reminders where patient_id = pid) then
    insert into reminders (patient_id, kind, title, time, note) values
      (pid, 'medication', 'Take medicine', '8:00 AM', 'Donepezil 5mg'),
      (pid, 'medication', 'Take medicine', '2:00 PM', null),
      (pid, 'medication', 'Take medicine', '9:00 PM', 'Amlodipine 5mg'),
      (pid, 'activity',   'Drink a glass of water', '11:00 AM', null),
      (pid, 'activity',   'Evening walk with Priya', '6:30 PM', null),
      (pid, 'activity',   'Check your blood pressure', '7:30 PM', null);
  end if;

  -- routine tasks (§15)
  if not exists (select 1 from tasks where patient_id = pid) then
    insert into tasks (patient_id, title, time, sort_order) values
      (pid, 'Morning walk in the garden', '7:30 AM', 0),
      (pid, 'Visit the temple', '9:00 AM', 1),
      (pid, 'Rest after lunch', '2:00 PM', 2),
      (pid, 'Tea with the family', '5:00 PM', 3),
      (pid, 'Evening prayer', '7:00 PM', 4),
      (pid, 'Call your son, Anil', '8:00 PM', 5);
  end if;

  -- contacts / SOS (§16)
  if not exists (select 1 from contacts where patient_id = pid) then
    insert into contacts (patient_id, name, relation, phone, category, is_primary, sort_order) values
      (pid, 'Priya', 'Daughter · Primary Caregiver', '+919800000001', 'caregiver', true, 0),
      (pid, 'Anil', 'Son', '+919800000003', 'family', false, 1),
      (pid, 'Meena', 'Neighbour', '+919800000004', 'family', false, 2),
      (pid, 'Dr. Sharma', 'Physician · City Hospital', '+919800000002', 'doctor', false, 3),
      (pid, 'Ambulance', '24x7 Emergency Ambulance', '108', 'emergency', true, 4),
      (pid, 'Police', 'Emergency Services', '100', 'emergency', false, 5),
      (pid, 'Women Helpline', 'Emergency Services', '1091', 'emergency', false, 6);
  end if;

  -- appointments — today's schedule (portal Reminder Vault)
  if not exists (select 1 from appointments where patient_id = pid) then
    insert into appointments (patient_id, title, time, type, with_whom, location, status) values
      (pid, 'Morning Medication', '08:00', 'Medication', '', '', 'done'),
      (pid, 'Neurologist Consultation', '09:30', 'Medical', 'Dr. Sharma', 'City Hospital, Guwahati', 'upcoming'),
      (pid, 'Physiotherapy Session', '11:00', 'Therapy', 'Anjali (PT)', 'Home visit', 'upcoming'),
      (pid, 'Memory Games Activity', '16:00', 'Activity', 'Caregiver', 'Living room', 'upcoming'),
      (pid, 'Evening Medication', '20:00', 'Medication', '', '', 'upcoming');
  end if;

  -- memories (§12) — text-only cards; caregiver adds photos from the portal
  if not exists (select 1 from memories where patient_id = pid) then
    insert into memories (patient_id, title, location, date, tags, caption) values
      (pid, 'Red Lal Cha', 'Guwahati, Assam', '2024-03-15', array['Family','Tea'], 'Traditional red tea preparation every morning'),
      (pid, 'Golden Silk Loom', 'Sualkuchi, Assam', '2024-02-20', array['Heritage','Craft'], 'Handloom golden Muga silk weaving at the family workshop'),
      (pid, 'Bihu Dance', 'Tezpur, Assam', '2024-04-14', array['Festival','Dance'], 'Rongali Bihu celebration with the whole family');
  end if;

  -- game progress + a week of daily history (§9, §10) — feeds the portal graphs
  if not exists (select 1 from game_progress where patient_id = pid) then
    insert into game_progress (patient_id, game_id, level, best_accuracy, last_played_at) values
      (pid, 'memory-flip', 3, 88, now()),
      (pid, 'pattern-recognition', 2, 74, now()),
      (pid, 'sequence-recall', 2, 69, now()),
      (pid, 'rule-switch', 1, 55, now());
  end if;

  if not exists (select 1 from daily_records where patient_id = pid) then
    insert into daily_records (patient_id, date, games_completed, avg_accuracy)
    select pid,
           (current_date - g)::date,
           4,
           58 + (g * 3) + (7 * sin(g))::int
    from generate_series(6, 1, -1) as g;
  end if;
end $$;

-- community posts (§22–§24) — shared, not patient-specific -----------------
insert into community_posts (author, author_role, title, body, excerpt, category, language, views, upvotes, comments, status, patient_visible)
select * from (values
  ('Priya Sharma','caregiver',
   'A morning routine that reduced my mother''s confusion',
   'We started keeping the curtains open from 6am and playing the same Bihu songs she grew up with while making tea. Within two weeks her early-morning agitation dropped noticeably. The trick was consistency — same order, same songs, same cup.',
   'Consistency — same order, same songs, same cup — cut my mother''s early-morning agitation within two weeks.',
   'Caregiving Practice','English',412,58,12,'approved',true),
  ('Nabanita Das','caregiver',
   'Today my father said my name',
   'After months of not recognising me, this morning he looked up and said my name clearly. We sat together for an hour looking at old family photos from Sualkuchi. To every caregiver having a hard week — the good days have not stopped, they are just further apart.',
   'After months, he looked up and said my name clearly. The good days have not stopped — they are just further apart.',
   'Positive Experience','Assamese',706,121,27,'approved',true),
  ('Dr. R. Menon','doctor',
   'Checklist: preparing for a neurologist appointment',
   'Bring: current medicine list with doses and timings, a short written note of new behaviours with dates, sleep pattern for the last 2 weeks, and one specific question you most want answered. Record the consultation with permission — you will not remember everything.',
   'What to bring to a neurologist appointment, and the one question to prepare.',
   'Helpful Info','English',289,44,6,'approved',true),
  ('Lakshmi','caregiver',
   'The evening walk that became our favourite habit',
   'A short walk near the temple every evening has become something we both look forward to. It settles the evening and gives us a shared, gentle routine that does not depend on memory.',
   'A short evening walk near the temple became a shared routine that does not depend on memory.',
   'Experience','English',233,39,9,'approved',true),
  ('Fatima','caregiver',
   'Keeping a photo book by the front door',
   'A small album of named family photos near the door helps with visitors and going out. Before anyone arrives we look through it together for a minute.',
   'A small album of named family photos by the door helps with visitors and going out.',
   'Caregiving Practice','English',521,143,15,'approved',true)
) as v(author, author_role, title, body, excerpt, category, language, views, upvotes, comments, status, patient_visible)
where not exists (select 1 from community_posts);

-- ============================================================================
--  DONE.  Demo credentials:
--    Patient access code : KAML-1234   (PIN: KAML1234)
--    Doctor access code  : DRSH-2024
-- ============================================================================

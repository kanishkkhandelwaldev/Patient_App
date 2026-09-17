-- ============================================================================
--  Migration: richer per-session metrics for the Cognitive Report
--
--  Run this ONCE in the Supabase SQL editor (after schema.sql). Idempotent.
--
--  Adds to game_results the five clinical metrics the games should capture:
--    reaction_ms         latency proxy (ms) — avg time per level this session
--    error_rate          0..1  (incorrect / total interactions)
--    abandoned           patient quit the session part-way (fatigue/frustration)
--    adaptive_threshold  highest difficulty level sustained this session
--    domain              cognitive domain  logic | memory | spatial | visual
--    source              'game' | 'memory_chest'
--
--  Then seeds ~90 days of history for the demo patient so every chart renders.
-- ============================================================================

alter table game_results
  add column if not exists reaction_ms        integer,
  add column if not exists error_rate         numeric,
  add column if not exists abandoned          boolean not null default false,
  add column if not exists adaptive_threshold integer,
  add column if not exists domain             text,
  add column if not exists source             text not null default 'game';

create index if not exists game_results_domain_idx on game_results(patient_id, domain, played_at desc);
create index if not exists game_results_source_idx on game_results(patient_id, source, played_at desc);

-- game_id  ->  cognitive domain (brain lobe). Mirrors GAME_DOMAIN in the app.
create or replace function game_domain(gid text)
returns text language sql immutable as $$
  select case gid
    when 'memory-flip'          then 'memory'
    when 'sequence-recall'      then 'memory'
    when 'musical-sequence'     then 'memory'
    when 'pattern-recognition'  then 'logic'
    when 'rule-switch'          then 'logic'
    when 'flow-free'            then 'spatial'
    when 'jigsaw-puzzle'        then 'spatial'
    when 'picture-recall'       then 'visual'
    when 'memory-chest'         then 'memory'
    else 'logic'
  end
$$;

-- Backfill domain / adaptive_threshold on any rows that predate this migration.
update game_results
   set domain = coalesce(domain, game_domain(game_id)),
       adaptive_threshold = coalesce(adaptive_threshold, level),
       error_rate = coalesce(error_rate, round((100 - accuracy)::numeric / 100, 2))
 where domain is null or adaptive_threshold is null or error_rate is null;

-- ----------------------------------------------------------------------------
--  Seed ~90 days of sessions for the demo patient (KAML-1234)
-- ----------------------------------------------------------------------------
do $$
declare
  pid uuid;
  d           int;      -- days ago
  day_date    timestamptz;
  sessions    int;
  s           int;
  gid         text;
  games       text[] := array['memory-flip','pattern-recognition','sequence-recall',
                              'flow-free','rule-switch','picture-recall',
                              'jigsaw-puzzle','musical-sequence'];
  acc         int;
  lvl         int;
  rt          int;
  decline     numeric;  -- 0 at day 90 -> ~1 now (gentle progression of decline)
  abandoned_day boolean;
begin
  select id into pid from patients where access_code = 'KAML-1234';
  if pid is null then return; end if;

  -- only seed if we haven't already
  if exists (select 1 from game_results where patient_id = pid and source = 'game' and reaction_ms is not null) then
    return;
  end if;

  for d in reverse 90..0 loop
    day_date := now() - make_interval(days => d);
    decline  := (90 - d)::numeric / 90;   -- 0 -> 1 across the window

    -- behavioural pattern: often abandons Tuesday + a scatter of evenings
    abandoned_day := (extract(dow from day_date) = 2 and random() < 0.7) or random() < 0.12;

    if abandoned_day then
      gid := games[1 + floor(random() * array_length(games,1))::int];
      insert into game_results (patient_id, game_id, accuracy, level, leveled_up,
                                reaction_ms, error_rate, abandoned, adaptive_threshold, domain, source, played_at)
      values (pid, gid, 20 + floor(random()*25)::int, 1, false,
              4200 + floor(random()*3000)::int, 0.7, true, 1, game_domain(gid), 'game',
              day_date - make_interval(hours => 3));
      continue;
    end if;

    sessions := 3 + floor(random() * 3)::int;   -- 3..5 games that day
    for s in 1..sessions loop
      gid := games[1 + floor(random() * array_length(games,1))::int];

      -- accuracy: starts ~78, drifts down with decline, per-domain + noise
      acc := greatest(35, least(98,
             78
             - round(decline * 22)::int
             - (case game_domain(gid) when 'spatial' then round(decline*10)::int   -- spatial drops faster
                                      when 'visual'  then round(decline*4)::int
                                      else 0 end)
             + floor(random()*16)::int - 8));

      lvl := greatest(1, least(3, 3 - round(decline * 1.5)::int + (case when random() < 0.3 then 1 else 0 end)));

      -- reaction time: the key signal — climbs steadily even while accuracy holds
      rt  := 1500 + round(decline * 2600)::int + floor(random()*700)::int;

      insert into game_results (patient_id, game_id, accuracy, level, leveled_up,
                                reaction_ms, error_rate, abandoned, adaptive_threshold, domain, source, played_at)
      values (pid, gid, acc, lvl, (acc >= 75),
              rt, round((100-acc)::numeric/100, 2), false, lvl, game_domain(gid), 'game',
              day_date - make_interval(hours => floor(random()*10)::int));
    end loop;

    -- Memory Chest ~every other day — deep/emotional memory stays strong
    if random() < 0.55 then
      insert into game_results (patient_id, game_id, accuracy, level, leveled_up,
                                reaction_ms, error_rate, abandoned, adaptive_threshold, domain, source, played_at)
      values (pid, 'memory-chest', greatest(60, least(100, 88 - round(decline*10)::int + floor(random()*12)::int - 6)),
              1, false, 2200 + floor(random()*1500)::int, null, false, 1, 'memory', 'memory_chest',
              day_date - make_interval(hours => 1));
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
--  Realtime for caregiver / doctor rows (two-way profile sync app <-> portal)
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['caregivers','doctors']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================================
--  Done. The Cognitive Report in both portals now has data, and caregiver /
--  doctor profile edits sync live between the patient app and the portals.
-- ============================================================================

import { supabase, isRemote } from './supabase';
import { GameId } from '../data/games';
import { CommunityCategory } from '../data/mock';
import type { AppState, GameProgress } from '../state/AppContext';

/**
 * Translation layer between Supabase rows and the patient-app AppState.
 *
 * Nothing here throws to the UI — every function is guarded by `isRemote` and
 * callers treat a rejection as "stay on local state". The reducer remains the
 * single source of truth on-device; these helpers pull the backend into it and
 * push local changes back out.
 */

export type RemoteBundle = Partial<AppState> & { patientId: string };

// --- DB category  →  patient-app CommunityCategory -------------------------
const CATEGORY_MAP: Record<string, CommunityCategory> = {
  'Positive Experience': 'positive-moments',
  'Positive Moments': 'positive-moments',
  'Caregiving Practice': 'caregiving-tips',
  'Helpful Info': 'caregiving-tips',
  Article: 'caregiving-tips',
  Routines: 'routines',
  Experience: 'experiences',
  Thought: 'experiences',
};
const toCategory = (c: string): CommunityCategory => CATEGORY_MAP[c] ?? 'experiences';

// -------------------------------------------------------------------------
//  Row → state mappers
// -------------------------------------------------------------------------

function mapReminders(rows: any[]): AppState['reminders'] {
  return (rows ?? [])
    .filter((r) => r.active !== false)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      time: r.time,
      note: r.note ?? undefined,
      acknowledged: !!r.acknowledged,
    }));
}

function mapTasks(rows: any[]): AppState['tasks'] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => ({ id: t.id, title: t.title, time: t.time ?? '', done: !!t.done }));
}

function mapContacts(rows: any[]): AppState['contacts'] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      relation: c.relation ?? '',
      phone: c.phone,
      category: c.category,
      isPrimary: !!c.is_primary,
    }));
}

function mapCommunity(rows: any[]): AppState['community'] {
  return (rows ?? [])
    .filter((p) => p.status === 'approved' && p.patient_visible)
    .map((p) => ({
      id: p.id,
      author: p.author,
      title: p.title,
      excerpt: p.excerpt || String(p.body || '').slice(0, 160),
      category: toCategory(p.category),
      language: p.language,
      upvotes: p.upvotes ?? 0,
      views: p.views ?? 0,
      approved: true as const,
    }));
}

function mapProgress(rows: any[]): Record<GameId, GameProgress> {
  const out = {} as Record<GameId, GameProgress>;
  for (const r of rows ?? []) {
    out[r.game_id as GameId] = {
      level: r.level ?? 1,
      bestAccuracy: r.best_accuracy ?? 0,
      lastPlayedAt: r.last_played_at ?? null,
    };
  }
  return out;
}

function mapHistory(rows: any[]): AppState['history'] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({
      date: d.date,
      gamesCompleted: d.games_completed ?? 0,
      avgAccuracy: d.avg_accuracy ?? 0,
    }))
    .slice(-14);
}

function mapCaregiver(row: any): AppState['caregiver'] | undefined {
  if (!row) return undefined;
  return { name: row.name ?? '', relation: row.relation ?? 'Primary caregiver', phone: row.phone ?? '' };
}

function mapDoctor(row: any): AppState['doctor'] {
  if (!row) return null;
  return { name: row.name ?? '', hospital: row.hospital ?? '', accessCode: row.access_code ?? '' };
}

function mapPatientRow(p: any): Partial<AppState> {
  return {
    profile: {
      name: p.name ?? '',
      caregiverName: p.caregiver_name ?? '',
      region: p.region ?? '',
      language: p.language ?? '',
      avatar: p.avatar ?? null,
      accessCode: p.access_code ?? '',
      pin: p.pin ?? '',
    },
    streak: p.streak ?? 0,
    milestone: p.milestone ?? 0,
    familyPhotoUri: p.family_photo_url ?? null,
    nextAppointment: p.next_appointment ?? null,
    contentPack: p.content_pack
      ? { ...p.content_pack, status: p.content_pack.status ?? 'ready', progress: p.content_pack.progress ?? 100 }
      : undefined,
  } as Partial<AppState>;
}

// -------------------------------------------------------------------------
//  Reads
// -------------------------------------------------------------------------

/** Load a full patient bundle by access code. Returns null if not found. */
export async function fetchBundle(accessCode: string): Promise<RemoteBundle | null> {
  if (!isRemote || !supabase) return null;
  const code = accessCode.trim().toUpperCase();
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('access_code', code)
    .maybeSingle();
  if (error || !patient) return null;

  const pid = String(patient.id);
  const [reminders, tasks, contacts, progress, history, community, caregiver, doctor] = await Promise.all([
    supabase.from('reminders').select('*').eq('patient_id', pid),
    supabase.from('tasks').select('*').eq('patient_id', pid),
    supabase.from('contacts').select('*').eq('patient_id', pid),
    supabase.from('game_progress').select('*').eq('patient_id', pid),
    supabase.from('daily_records').select('*').eq('patient_id', pid).order('date', { ascending: true }),
    supabase.from('community_posts').select('*').eq('status', 'approved').eq('patient_visible', true),
    supabase.from('caregivers').select('*').eq('patient_id', pid).order('created_at', { ascending: true }).limit(1),
    supabase.from('doctors').select('*').eq('patient_id', pid).order('created_at', { ascending: true }).limit(1),
  ]);

  return {
    ...mapPatientRow(patient),
    reminders: mapReminders(reminders.data ?? []),
    tasks: mapTasks(tasks.data ?? []),
    contacts: mapContacts(contacts.data ?? []),
    progress: mapProgress(progress.data ?? []),
    history: mapHistory(history.data ?? []),
    community: mapCommunity(community.data ?? []),
    caregiver: mapCaregiver(caregiver.data?.[0]),
    doctor: mapDoctor(doctor.data?.[0]),
    patientId: pid,
  };
}

/** Raw session rows for the in-app Cognitive Report. */
export async function fetchGameResults(patientId: string, sinceDays = 120): Promise<any[]> {
  if (!isRemote || !supabase) return [];
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .eq('patient_id', patientId)
    .gte('played_at', since)
    .order('played_at', { ascending: true });
  if (error) return [];
  return data ?? [];
}

/** Create a brand-new patient (called at the end of onboarding). */
export async function createPatient(input: {
  name: string;
  caregiverName: string;
  caregiverPhone?: string;
  region: string;
  language: string;
  avatar: string | null;
  accessCode: string;
  pin: string;
  reminders: { kind: string; title: string; time: string; note?: string }[];
  contentPack?: any;
}): Promise<RemoteBundle | null> {
  if (!isRemote || !supabase) return null;
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      access_code: input.accessCode.trim().toUpperCase(),
      name: input.name,
      caregiver_name: input.caregiverName,
      region: input.region,
      language: input.language,
      avatar: input.avatar,
      pin: input.pin,
      content_pack: input.contentPack ?? null,
    })
    .select()
    .single();
  if (error || !patient) return null;

  const pid = patient.id as string;
  await Promise.all([
    supabase.from('caregivers').insert({
      patient_id: pid,
      name: input.caregiverName,
      relation: 'Primary caregiver',
      phone: input.caregiverPhone ?? '',
    }),
    input.reminders.length
      ? supabase.from('reminders').insert(
          input.reminders.map((r) => ({
            patient_id: pid,
            kind: r.kind,
            title: r.title,
            time: r.time,
            note: r.note ?? null,
          })),
        )
      : Promise.resolve(),
  ]);

  return fetchBundle(input.accessCode);
}

// -------------------------------------------------------------------------
//  Writes (fire-and-forget; caller queues when offline)
// -------------------------------------------------------------------------

export interface GameResultInput {
  gameId: string;
  accuracy: number;
  level: number;
  leveledUp: boolean;
  domain?: string | null;
  reactionMs?: number | null;
  abandoned?: boolean;
  source?: 'game' | 'memory_chest';
}

export async function pushGameResult(patientId: string, r: GameResultInput) {
  if (!isRemote || !supabase) return;
  const abandoned = r.abandoned ?? false;
  await supabase.from('game_results').insert({
    patient_id: patientId,
    game_id: r.gameId,
    accuracy: r.accuracy,
    level: r.level,
    leveled_up: r.leveledUp,
    domain: r.domain ?? null,
    reaction_ms: r.reactionMs ?? null,
    error_rate: abandoned ? null : Math.round((100 - r.accuracy)) / 100,
    abandoned,
    adaptive_threshold: r.level,
    source: r.source ?? 'game',
  });
  // Progress / best-accuracy only advances on a real completed game session.
  if (!abandoned && (r.source ?? 'game') === 'game') {
    await supabase.from('game_progress').upsert(
      {
        patient_id: patientId,
        game_id: r.gameId,
        level: r.level,
        best_accuracy: r.accuracy,
        last_played_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,game_id' },
    );
  }
}

export async function pushDailyRecord(
  patientId: string,
  rec: { date: string; gamesCompleted: number; avgAccuracy: number },
) {
  if (!isRemote || !supabase) return;
  await supabase.from('daily_records').upsert(
    {
      patient_id: patientId,
      date: rec.date,
      games_completed: rec.gamesCompleted,
      avg_accuracy: rec.avgAccuracy,
    },
    { onConflict: 'patient_id,date' },
  );
}

export async function pushStreakMilestone(patientId: string, streak: number, milestone: number) {
  if (!isRemote || !supabase) return;
  await supabase.from('patients').update({ streak, milestone }).eq('id', patientId);
}

export async function pushTaskDone(taskId: string, done: boolean) {
  if (!isRemote || !supabase) return;
  await supabase.from('tasks').update({ done }).eq('id', taskId);
}

export async function pushReminderAck(reminderId: string, acknowledged: boolean) {
  if (!isRemote || !supabase) return;
  await supabase.from('reminders').update({ acknowledged }).eq('id', reminderId);
}

export async function pushProfile(
  patientId: string,
  patch: Partial<{ name: string; caregiver_name: string; region: string; language: string; avatar: string | null; pin: string; family_photo_url: string | null }>,
) {
  if (!isRemote || !supabase) return;
  await supabase.from('patients').update(patch).eq('id', patientId);
}

/** Upsert the caregiver row and keep patients.caregiver_name in step. */
export async function pushCaregiver(patientId: string, patch: Record<string, unknown>) {
  if (!isRemote || !supabase) return;
  const { data: rows } = await supabase
    .from('caregivers')
    .select('id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
    .limit(1);
  const existing = rows?.[0];
  if (existing) {
    await supabase.from('caregivers').update(patch).eq('id', existing.id);
  } else {
    await supabase.from('caregivers').insert({ patient_id: patientId, ...patch });
  }
  if (typeof patch.name === 'string') {
    await supabase.from('patients').update({ caregiver_name: patch.name }).eq('id', patientId);
  }
}

/** Add a doctor (spec §21.5) and return the row incl. its generated access code. */
export async function addDoctor(
  patientId: string,
  input: { name: string; hospital: string },
): Promise<AppState['doctor']> {
  if (!isRemote || !supabase) return null;
  const seed = (input.name || 'DR').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const code = `${seed}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await supabase
    .from('doctors')
    .insert({ patient_id: patientId, name: input.name, hospital: input.hospital, access_code: code })
    .select()
    .single();
  if (error || !data) return null;
  return mapDoctor(data);
}

// -------------------------------------------------------------------------
//  Realtime
// -------------------------------------------------------------------------

type Handlers = {
  onPatient?: (partial: Partial<AppState>) => void;
  onReminders?: (reminders: AppState['reminders']) => void;
  onTasks?: (tasks: AppState['tasks']) => void;
  onContacts?: (contacts: AppState['contacts']) => void;
  onCommunity?: (community: AppState['community']) => void;
  onCaregiver?: (caregiver: AppState['caregiver']) => void;
  onDoctor?: (doctor: AppState['doctor']) => void;
};

/**
 * Subscribe to everything the caregiver / doctor can change. On any change we
 * re-fetch that slice and hand the mapped result to the caller, which merges
 * it into reducer state. Returns an unsubscribe function.
 */
export function subscribe(patientId: string, handlers: Handlers): () => void {
  if (!isRemote || !supabase) return () => {};

  const reload = {
    reminders: async () => {
      const { data } = await supabase!.from('reminders').select('*').eq('patient_id', patientId);
      handlers.onReminders?.(mapReminders(data ?? []));
    },
    tasks: async () => {
      const { data } = await supabase!.from('tasks').select('*').eq('patient_id', patientId);
      handlers.onTasks?.(mapTasks(data ?? []));
    },
    contacts: async () => {
      const { data } = await supabase!.from('contacts').select('*').eq('patient_id', patientId);
      handlers.onContacts?.(mapContacts(data ?? []));
    },
    community: async () => {
      const { data } = await supabase!
        .from('community_posts')
        .select('*')
        .eq('status', 'approved')
        .eq('patient_visible', true);
      handlers.onCommunity?.(mapCommunity(data ?? []));
    },
    caregiver: async () => {
      const { data } = await supabase!
        .from('caregivers').select('*').eq('patient_id', patientId)
        .order('created_at', { ascending: true }).limit(1);
      const mapped = mapCaregiver(data?.[0]);
      if (mapped) handlers.onCaregiver?.(mapped);
    },
    doctor: async () => {
      const { data } = await supabase!
        .from('doctors').select('*').eq('patient_id', patientId)
        .order('created_at', { ascending: true }).limit(1);
      handlers.onDoctor?.(mapDoctor(data?.[0]));
    },
  };

  const channel = supabase
    .channel(`patient-sync:${patientId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'patients', filter: `id=eq.${patientId}` },
      (payload) => handlers.onPatient?.(mapPatientRow(payload.new)),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${patientId}` },
      () => reload.reminders(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `patient_id=eq.${patientId}` },
      () => reload.tasks(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contacts', filter: `patient_id=eq.${patientId}` },
      () => reload.contacts(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'community_posts' },
      () => reload.community(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'caregivers', filter: `patient_id=eq.${patientId}` },
      () => reload.caregiver(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'doctors', filter: `patient_id=eq.${patientId}` },
      () => reload.doctor(),
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

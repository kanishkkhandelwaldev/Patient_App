import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameId, GAME_DOMAIN } from '../data/games';
import { isRemote } from '../lib/supabase';
import { fetchBundle, createPatient, subscribe } from '../lib/remote';
import { dispatchOp, flushOutbox } from '../lib/outbox';
import {
  Appointment,
  CommunityPost,
  COMMUNITY_POSTS,
  Contact,
  ContentPackInfo,
  DEFAULT_CONTACTS,
  DEFAULT_TASKS,
  findPack,
  Reminder,
  SEED_APPOINTMENT,
  SEED_REMINDERS,
  Task,
} from '../data/mock';

const STORAGE_KEY = 'sih-cognitive-care/state/v2';

export type AvatarId = 'aita' | 'koka';

export interface GameProgress {
  level: number; // 1-3, persists across sessions (does not reset daily)
  bestAccuracy: number; // 0-100
  lastPlayedAt: string | null;
}

export interface PatientProfile {
  name: string;
  caregiverName: string;
  region: string;
  language: string;
  avatar: AvatarId | null;
  accessCode: string;
  pin: string;
}

export interface CaregiverInfo {
  name: string;
  relation: string;
  phone: string;
}

export interface DoctorInfo {
  name: string;
  hospital: string;
  accessCode: string;
}

export interface DailyRecord {
  date: string; // ISO date, e.g. 2026-09-05
  gamesCompleted: number;
  avgAccuracy: number;
}

export type PackStatus = 'none' | 'downloading' | 'ready';

export interface ContentPackState extends ContentPackInfo {
  status: PackStatus;
  progress: number; // 0-100
}

export interface AppState {
  hydrated: boolean; // local storage has been read (or confirmed empty)
  authenticated: boolean;
  onboardingComplete: boolean;
  patientId: string | null; // backend patient row id, once synced (null = local-only)
  profile: PatientProfile;
  caregiver: CaregiverInfo;
  doctor: DoctorInfo | null; // added by caregiver/patient, holds the doctor access code (§21.5)
  contentPack: ContentPackState;
  contacts: Contact[];
  tasks: Task[];
  reminders: Reminder[];
  activeReminderId: string | null; // drives the in-game reminder overlay (§18)
  nextAppointment: Appointment | null;
  familyPhotoUri: string | null;
  community: CommunityPost[];
  progress: Record<GameId, GameProgress>;
  milestone: number; // completed daily sets, drives unlocking + adaptive difficulty
  todayCompletedGameIds: GameId[];
  todayAccuracies: number[]; // per-game session accuracy recorded today, for the daily average
  todaySetCompletedAt: string | null;
  streak: number;
  history: DailyRecord[]; // last N days of completed-set summaries, for the Progress screen
  isOnline: boolean; // simulated connectivity toggle for demoing offline-first behavior
  pendingSync: number; // number of local changes not yet "synced"
  syncLog: string[]; // human-readable record of what synced, newest first (§20)
  preDownloadedDays: number; // days of content available offline (§19)
}

const initialProfile: PatientProfile = {
  name: '',
  caregiverName: '',
  region: '',
  language: '',
  avatar: null,
  accessCode: '',
  pin: '',
};

const emptyPack: ContentPackState = {
  region: '',
  language: '',
  greeting: 'Namaste',
  sizeMb: 0,
  status: 'none',
  progress: 0,
};

// A fresh, unseeded state — used before onboarding and by RESET_DEMO's
// "start from scratch" path.
const blankState: AppState = {
  hydrated: false,
  authenticated: false,
  onboardingComplete: false,
  patientId: null,
  profile: initialProfile,
  caregiver: { name: '', relation: '', phone: '' },
  doctor: null,
  contentPack: emptyPack,
  contacts: DEFAULT_CONTACTS,
  tasks: DEFAULT_TASKS,
  reminders: [],
  activeReminderId: null,
  nextAppointment: SEED_APPOINTMENT,
  familyPhotoUri: null,
  community: COMMUNITY_POSTS,
  progress: {} as Record<GameId, GameProgress>,
  milestone: 0,
  todayCompletedGameIds: [],
  todayAccuracies: [],
  todaySetCompletedAt: null,
  streak: 0,
  history: [],
  isOnline: true,
  pendingSync: 0,
  syncLog: [],
  preDownloadedDays: 3,
};

// A populated demo patient so every screen looks alive during a judge walkthrough.
// "Skip to Home" (presenter control) lands here; onboarding still builds its own.
function seededDemoState(): AppState {
  const pack = findPack('Assam', 'Assamese');
  const today = new Date();
  const history: DailyRecord[] = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      gamesCompleted: 4,
      avgAccuracy: 62 + Math.round(Math.sin(i) * 8) + i * 2,
    };
  });
  const progress: Record<GameId, GameProgress> = {
    'memory-flip': { level: 3, bestAccuracy: 88, lastPlayedAt: today.toISOString() },
    'pattern-recognition': { level: 2, bestAccuracy: 74, lastPlayedAt: today.toISOString() },
    'sequence-recall': { level: 2, bestAccuracy: 69, lastPlayedAt: today.toISOString() },
    'rule-switch': { level: 1, bestAccuracy: 55, lastPlayedAt: today.toISOString() },
  } as Record<GameId, GameProgress>;

  return {
    ...blankState,
    authenticated: true,
    onboardingComplete: true,
    profile: {
      name: 'Kamala',
      caregiverName: 'Priya',
      region: 'Assam',
      language: 'Assamese',
      avatar: 'aita',
      accessCode: 'KAML-1234',
      pin: '1234',
    },
    caregiver: { name: 'Priya', relation: 'Daughter', phone: '+919800000001' },
    contentPack: { ...pack, status: 'ready', progress: 100 },
    reminders: SEED_REMINDERS,
    familyPhotoUri: null,
    progress,
    milestone: 1, // unlockedGameCount(1) === 4 → clean "start with 4 games" story
    streak: 6,
    history,
  };
}

const initialState = blankState;

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'MARK_HYDRATED' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'UPDATE_PROFILE'; payload: Partial<PatientProfile> }
  | { type: 'SET_CAREGIVER'; payload: Partial<CaregiverInfo> }
  | { type: 'SET_DOCTOR'; payload: DoctorInfo | null }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'START_PACK_DOWNLOAD'; region: string; language: string }
  | { type: 'PACK_PROGRESS'; progress: number }
  | { type: 'PACK_READY' }
  | { type: 'RECORD_GAME_RESULT'; gameId: GameId; accuracy: number; leveledUp: boolean; reactionMs?: number; abandoned?: boolean }
  | { type: 'RECORD_MEMORY_RESULT'; accuracy: number } // Memory Chest recall score
  | { type: 'RESET_DAILY_SET' }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'ADD_REMINDER'; reminder: Reminder }
  | { type: 'TOGGLE_REMINDER'; id: string }
  | { type: 'FIRE_REMINDER'; id?: string } // id omitted → soonest un-acked
  | { type: 'ACK_REMINDER' }
  | { type: 'SET_FAMILY_PHOTO'; uri: string | null }
  | { type: 'SET_APPOINTMENT'; appointment: Appointment | null }
  | { type: 'REACT_TO_POST'; id: string; reacted: boolean }
  | { type: 'SET_ONLINE'; value: boolean }
  | { type: 'CLEAR_PENDING_SYNC' }
  | { type: 'QUEUE_CHANGE'; label: string } // local edit made offline (§17/§20)
  | { type: 'ADVANCE_DAY' }
  | { type: 'RESET_DEMO'; seeded: boolean }
  | { type: 'SET_PATIENT_ID'; patientId: string | null } // backend row linked
  | { type: 'REMOTE_MERGE'; payload: Partial<AppState> }  // pull backend state in
  | { type: 'SYNC_NOTE'; label: string };                 // append to the sync log

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...blankState, ...action.payload, hydrated: true, activeReminderId: null };
    case 'MARK_HYDRATED':
      return { ...state, hydrated: true };
    case 'SIGN_IN':
      return { ...state, authenticated: true };
    case 'SIGN_OUT':
      return { ...blankState, hydrated: true };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'SET_CAREGIVER':
      return { ...state, caregiver: { ...state.caregiver, ...action.payload } };
    case 'SET_DOCTOR':
      return { ...state, doctor: action.payload };
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };
    case 'START_PACK_DOWNLOAD': {
      const pack = findPack(action.region, action.language);
      return {
        ...state,
        profile: { ...state.profile, region: action.region, language: action.language },
        contentPack: { ...pack, status: 'downloading', progress: 0 },
      };
    }
    case 'PACK_PROGRESS':
      return { ...state, contentPack: { ...state.contentPack, progress: action.progress } };
    case 'PACK_READY':
      return { ...state, contentPack: { ...state.contentPack, status: 'ready', progress: 100 } };
    case 'RECORD_GAME_RESULT': {
      // An abandoned session is recorded for the backend only (see mirrorToRemote)
      // — it must not advance the patient's level, streak or daily set.
      if (action.abandoned) return { ...state, pendingSync: state.pendingSync + 1 };
      const prev = state.progress[action.gameId] ?? { level: 1, bestAccuracy: 0, lastPlayedAt: null };
      const nextLevel = action.leveledUp ? Math.min(3, prev.level + 1) : Math.max(1, prev.level);
      const alreadyDoneToday = state.todayCompletedGameIds.includes(action.gameId);
      const todayCompletedGameIds = alreadyDoneToday
        ? state.todayCompletedGameIds
        : [...state.todayCompletedGameIds, action.gameId];
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.gameId]: {
            level: nextLevel,
            bestAccuracy: Math.max(prev.bestAccuracy, action.accuracy),
            lastPlayedAt: new Date().toISOString(),
          },
        },
        todayCompletedGameIds,
        todayAccuracies: [...state.todayAccuracies, action.accuracy],
        pendingSync: state.pendingSync + 1,
      };
    }
    case 'RECORD_MEMORY_RESULT':
      // Memory Chest recall — backend only (feeds the "Memory Chest vs games" chart).
      return { ...state, pendingSync: state.pendingSync + 1 };
    case 'RESET_DAILY_SET': {
      const avgAccuracy = state.todayAccuracies.length
        ? Math.round(state.todayAccuracies.reduce((a, b) => a + b, 0) / state.todayAccuracies.length)
        : 0;
      const record: DailyRecord = {
        date: new Date().toISOString().slice(0, 10),
        gamesCompleted: state.todayCompletedGameIds.length,
        avgAccuracy,
      };
      return {
        ...state,
        todayCompletedGameIds: [],
        todayAccuracies: [],
        todaySetCompletedAt: null,
        milestone: state.milestone + 1,
        streak: state.streak + 1,
        history: [...state.history, record].slice(-14),
      };
    }
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
        pendingSync: state.pendingSync + 1,
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task], pendingSync: state.pendingSync + 1 };
    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.reminder] };
    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.id ? { ...r, acknowledged: !r.acknowledged } : r
        ),
      };
    case 'FIRE_REMINDER': {
      const target =
        action.id ?? state.reminders.find((r) => !r.acknowledged)?.id ?? null;
      return { ...state, activeReminderId: target };
    }
    case 'ACK_REMINDER': {
      const active = state.reminders.find((r) => r.id === state.activeReminderId);
      return {
        ...state,
        activeReminderId: null,
        reminders: state.reminders.map((r) =>
          r.id === state.activeReminderId ? { ...r, acknowledged: true } : r
        ),
        syncLog: active ? [`Reminder acknowledged — ${active.title}`, ...state.syncLog] : state.syncLog,
        pendingSync: state.pendingSync + (active ? 1 : 0),
      };
    }
    case 'SET_FAMILY_PHOTO':
      return { ...state, familyPhotoUri: action.uri };
    case 'SET_APPOINTMENT':
      return { ...state, nextAppointment: action.appointment };
    case 'REACT_TO_POST':
      return {
        ...state,
        community: state.community.map((p) =>
          p.id === action.id ? { ...p, upvotes: p.upvotes + (action.reacted ? 1 : -1) } : p
        ),
      };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.value };
    case 'CLEAR_PENDING_SYNC':
      return { ...state, pendingSync: 0 };
    case 'QUEUE_CHANGE':
      return {
        ...state,
        pendingSync: state.pendingSync + 1,
        syncLog: [action.label, ...state.syncLog],
      };
    case 'ADVANCE_DAY': {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const record: DailyRecord = {
        date: d.toISOString().slice(0, 10),
        gamesCompleted: 4,
        avgAccuracy: 60 + Math.floor(Math.random() * 25),
      };
      return {
        ...state,
        streak: state.streak + 1,
        milestone: state.milestone + 1,
        todayCompletedGameIds: [],
        todayAccuracies: [],
        history: [...state.history, record].slice(-14),
        reminders: state.reminders.map((r) => ({ ...r, acknowledged: false })),
      };
    }
    case 'RESET_DEMO':
      return action.seeded
        ? { ...seededDemoState(), hydrated: true }
        : { ...blankState, hydrated: true };
    case 'SET_PATIENT_ID':
      return { ...state, patientId: action.patientId };
    case 'REMOTE_MERGE': {
      // Merge only the keys the backend actually sent. profile / contentPack
      // are merged one level deep so a partial patient row doesn't blank fields.
      const p = action.payload;
      const next: AppState = { ...state };
      (Object.keys(p) as (keyof AppState)[]).forEach((k) => {
        const v = p[k];
        if (v === undefined) return;
        if (k === 'profile') next.profile = { ...state.profile, ...(v as Partial<PatientProfile>) };
        else if (k === 'contentPack') next.contentPack = { ...state.contentPack, ...(v as Partial<ContentPackState>) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else (next as any)[k] = v;
      });
      return next;
    }
    case 'SYNC_NOTE':
      return { ...state, syncLog: [action.label, ...state.syncLog].slice(0, 20) };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState);

  // Latest state, readable synchronously inside the dispatch wrapper.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Public dispatch: applies the action locally, then mirrors the relevant
  // ones to the backend (immediately if online, queued in the outbox if not).
  const dispatch = useCallback<React.Dispatch<Action>>((action) => {
    const pre = stateRef.current;
    baseDispatch(action);
    if (isRemote) void mirrorToRemote(action, pre);
  }, []);

  // Load persisted state on boot (offline-first: local storage is the source
  // of truth on-device; a real backend sync would reconcile this on connect).
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          baseDispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } else {
          baseDispatch({ type: 'MARK_HYDRATED' });
        }
      } catch (e) {
        console.warn('Failed to hydrate local state', e);
        baseDispatch({ type: 'MARK_HYDRATED' });
      }
    })();
  }, []);

  // Persist on every change (once initial hydration has happened, so we don't
  // clobber stored state with the empty bootstrap value).
  useEffect(() => {
    if (!state.hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Failed to persist local state', e)
    );
  }, [state]);

  // Simulated "sync when internet is available" — clears the local pending
  // counter used by the offline-first UI copy (spec §20).
  useEffect(() => {
    if (state.isOnline && state.pendingSync > 0) {
      const t = setTimeout(() => baseDispatch({ type: 'CLEAR_PENDING_SYNC' }), 1400);
      return () => clearTimeout(t);
    }
  }, [state.isOnline, state.pendingSync]);

  // ---------------------------------------------------------------------
  //  Backend sync (only when EXPO_PUBLIC_SUPABASE_* are configured)
  // ---------------------------------------------------------------------

  // Pull the patient bundle from Supabase once the account is known, then keep
  // it live over realtime. Caregiver / doctor edits land here.
  const syncRef = useRef<{ code: string | null; unsub: null | (() => void) }>({ code: null, unsub: null });
  useEffect(() => {
    if (!isRemote || !state.hydrated) return;
    const code = state.profile.accessCode;
    const ready = state.authenticated && state.onboardingComplete && !!code;

    if (!ready) {
      if (syncRef.current.unsub) syncRef.current.unsub();
      syncRef.current = { code: null, unsub: null };
      return;
    }
    if (syncRef.current.code === code) return; // already synced this account
    if (syncRef.current.unsub) syncRef.current.unsub();
    syncRef.current = { code, unsub: null };

    let cancelled = false;
    (async () => {
      try {
        const s = stateRef.current;
        let bundle = await fetchBundle(code);
        if (!bundle) {
          bundle = await createPatient({
            name: s.profile.name,
            caregiverName: s.profile.caregiverName || s.caregiver.name,
            caregiverPhone: s.caregiver.phone,
            region: s.profile.region,
            language: s.profile.language,
            avatar: s.profile.avatar,
            accessCode: code,
            pin: s.profile.pin,
            reminders: s.reminders.map((r) => ({ kind: r.kind, title: r.title, time: r.time, note: r.note })),
            contentPack: s.contentPack,
          });
        }
        if (cancelled || !bundle) {
          if (!bundle) syncRef.current.code = null; // allow a retry
          return;
        }
        const { patientId, ...partial } = bundle;
        baseDispatch({ type: 'SET_PATIENT_ID', patientId });
        baseDispatch({ type: 'REMOTE_MERGE', payload: partial });
        baseDispatch({ type: 'SYNC_NOTE', label: 'Connected to the central backend' });

        syncRef.current.unsub = subscribe(patientId, {
          onPatient: (p) => baseDispatch({ type: 'REMOTE_MERGE', payload: p }),
          onReminders: (reminders) => baseDispatch({ type: 'REMOTE_MERGE', payload: { reminders } }),
          onTasks: (tasks) => baseDispatch({ type: 'REMOTE_MERGE', payload: { tasks } }),
          onContacts: (contacts) => baseDispatch({ type: 'REMOTE_MERGE', payload: { contacts } }),
          onCommunity: (community) => baseDispatch({ type: 'REMOTE_MERGE', payload: { community } }),
          onCaregiver: (caregiver) => baseDispatch({ type: 'REMOTE_MERGE', payload: { caregiver } }),
          onDoctor: (doctor) => baseDispatch({ type: 'REMOTE_MERGE', payload: { doctor } }),
        });
      } catch (e) {
        console.warn('[sih] backend sync failed', e);
        syncRef.current.code = null; // retry on next state change
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.hydrated, state.authenticated, state.onboardingComplete, state.profile.accessCode]);

  // Flush queued offline writes when connectivity returns.
  useEffect(() => {
    if (!isRemote || !state.isOnline || !state.patientId) return;
    flushOutbox().then((n) => {
      if (n > 0) baseDispatch({ type: 'SYNC_NOTE', label: `Synced ${n} offline change${n === 1 ? '' : 's'}` });
    });
  }, [state.isOnline, state.patientId]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ---------------------------------------------------------------------------
//  Local action  →  backend write(s)
// ---------------------------------------------------------------------------

async function mirrorToRemote(action: Action, pre: AppState): Promise<void> {
  const pid = pre.patientId;
  const online = pre.isOnline;
  switch (action.type) {
    case 'RECORD_GAME_RESULT': {
      if (!pid) return;
      const prev = pre.progress[action.gameId] ?? { level: 1, bestAccuracy: 0, lastPlayedAt: null };
      const level = action.leveledUp ? Math.min(3, prev.level + 1) : Math.max(1, prev.level);
      await dispatchOp(
        {
          t: 'game',
          patientId: pid,
          gameId: action.gameId,
          accuracy: action.accuracy,
          level,
          leveledUp: action.leveledUp,
          domain: GAME_DOMAIN[action.gameId] ?? null,
          reactionMs: action.reactionMs ?? null,
          abandoned: action.abandoned ?? false,
          source: 'game',
        },
        online,
      );
      return;
    }
    case 'RECORD_MEMORY_RESULT': {
      if (!pid) return;
      await dispatchOp(
        {
          t: 'game',
          patientId: pid,
          gameId: 'memory-chest',
          accuracy: action.accuracy,
          level: 1,
          leveledUp: false,
          domain: 'memory',
          source: 'memory_chest',
        },
        online,
      );
      return;
    }
    case 'RESET_DAILY_SET': {
      if (!pid) return;
      const avg = pre.todayAccuracies.length
        ? Math.round(pre.todayAccuracies.reduce((a, b) => a + b, 0) / pre.todayAccuracies.length)
        : 0;
      await dispatchOp(
        {
          t: 'daily',
          patientId: pid,
          date: new Date().toISOString().slice(0, 10),
          gamesCompleted: pre.todayCompletedGameIds.length,
          avgAccuracy: avg,
        },
        online,
      );
      await dispatchOp(
        { t: 'streak', patientId: pid, streak: pre.streak + 1, milestone: pre.milestone + 1 },
        online,
      );
      return;
    }
    case 'ADVANCE_DAY': {
      if (!pid) return;
      await dispatchOp(
        { t: 'streak', patientId: pid, streak: pre.streak + 1, milestone: pre.milestone + 1 },
        online,
      );
      return;
    }
    case 'TOGGLE_TASK': {
      if (!pid) return;
      const task = pre.tasks.find((t) => t.id === action.id);
      if (task) await dispatchOp({ t: 'task', taskId: action.id, done: !task.done }, online);
      return;
    }
    case 'TOGGLE_REMINDER': {
      if (!pid) return;
      const r = pre.reminders.find((x) => x.id === action.id);
      if (r) await dispatchOp({ t: 'ack', reminderId: action.id, acknowledged: !r.acknowledged }, online);
      return;
    }
    case 'ACK_REMINDER': {
      if (!pid || !pre.activeReminderId) return;
      await dispatchOp({ t: 'ack', reminderId: pre.activeReminderId, acknowledged: true }, online);
      return;
    }
    case 'SET_FAMILY_PHOTO': {
      if (!pid) return;
      await dispatchOp({ t: 'profile', patientId: pid, patch: { family_photo_url: action.uri } }, online);
      return;
    }
    case 'UPDATE_PROFILE': {
      if (!pid) return;
      const map: Record<string, string> = {
        name: 'name',
        caregiverName: 'caregiver_name',
        region: 'region',
        language: 'language',
        avatar: 'avatar',
        pin: 'pin',
      };
      const patch: Record<string, unknown> = {};
      Object.entries(action.payload).forEach(([k, v]) => {
        if (map[k] !== undefined) patch[map[k]] = v;
      });
      if (Object.keys(patch).length) await dispatchOp({ t: 'profile', patientId: pid, patch }, online);
      return;
    }
    case 'SET_CAREGIVER': {
      if (!pid) return;
      const patch: Record<string, unknown> = {};
      if (action.payload.name !== undefined) patch.name = action.payload.name;
      if (action.payload.relation !== undefined) patch.relation = action.payload.relation;
      if (action.payload.phone !== undefined) patch.phone = action.payload.phone;
      if (Object.keys(patch).length) await dispatchOp({ t: 'caregiver', patientId: pid, patch }, online);
      return;
    }
    default:
      return;
  }
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export { seededDemoState };

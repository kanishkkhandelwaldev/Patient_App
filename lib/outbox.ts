import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pushGameResult,
  pushDailyRecord,
  pushStreakMilestone,
  pushTaskDone,
  pushReminderAck,
  pushProfile,
  pushCaregiver,
} from './remote';

/**
 * Offline-first write queue (spec §20). Every local change that must reach the
 * backend becomes a RemoteOp. If we're online it runs immediately; if it fails
 * or we're offline it's persisted and retried when connectivity returns.
 */

export type RemoteOp =
  | {
      t: 'game';
      patientId: string;
      gameId: string;
      accuracy: number;
      level: number;
      leveledUp: boolean;
      domain?: string | null;
      reactionMs?: number | null;
      abandoned?: boolean;
      source?: 'game' | 'memory_chest';
    }
  | { t: 'daily'; patientId: string; date: string; gamesCompleted: number; avgAccuracy: number }
  | { t: 'streak'; patientId: string; streak: number; milestone: number }
  | { t: 'task'; taskId: string; done: boolean }
  | { t: 'ack'; reminderId: string; acknowledged: boolean }
  | { t: 'profile'; patientId: string; patch: Record<string, unknown> }
  | { t: 'caregiver'; patientId: string; patch: Record<string, unknown> };

const KEY = 'sih-cognitive-care/outbox/v1';

async function readQueue(): Promise<RemoteOp[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RemoteOp[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(ops: RemoteOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    /* ignore */
  }
}

async function runOp(op: RemoteOp): Promise<void> {
  switch (op.t) {
    case 'game':
      return pushGameResult(op.patientId, {
        gameId: op.gameId,
        accuracy: op.accuracy,
        level: op.level,
        leveledUp: op.leveledUp,
        domain: op.domain,
        reactionMs: op.reactionMs,
        abandoned: op.abandoned,
        source: op.source,
      });
    case 'daily':
      return pushDailyRecord(op.patientId, {
        date: op.date,
        gamesCompleted: op.gamesCompleted,
        avgAccuracy: op.avgAccuracy,
      });
    case 'streak':
      return pushStreakMilestone(op.patientId, op.streak, op.milestone);
    case 'task':
      return pushTaskDone(op.taskId, op.done);
    case 'ack':
      return pushReminderAck(op.reminderId, op.acknowledged);
    case 'profile':
      return pushProfile(op.patientId, op.patch);
    case 'caregiver':
      return pushCaregiver(op.patientId, op.patch);
    default:
      return undefined;
  }
}

async function enqueue(op: RemoteOp): Promise<void> {
  const q = await readQueue();
  q.push(op);
  await writeQueue(q);
}

/** Run now if online, otherwise queue. Also queues on transient failure. */
export async function dispatchOp(op: RemoteOp, online: boolean): Promise<void> {
  if (!online) {
    await enqueue(op);
    return;
  }
  try {
    await runOp(op);
  } catch {
    await enqueue(op);
  }
}

/** Drain the queue (call when connectivity returns). Returns ops flushed. */
export async function flushOutbox(): Promise<number> {
  let q = await readQueue();
  if (q.length === 0) return 0;
  const remaining: RemoteOp[] = [];
  let flushed = 0;
  for (const op of q) {
    try {
      await runOp(op);
      flushed += 1;
    } catch {
      remaining.push(op);
    }
  }
  await writeQueue(remaining);
  return flushed;
}

export async function pendingOpCount(): Promise<number> {
  return (await readQueue()).length;
}

import { GAME_DOMAIN, GameId } from '../data/games';

/**
 * Aggregations for the Cognitive Report (spec §25.1). Pure functions over the
 * raw game_results rows returned by lib/remote.ts::fetchGameResults.
 *
 * Row shape (snake_case, straight from Supabase):
 *   { game_id, accuracy, level, reaction_ms, error_rate, abandoned,
 *     adaptive_threshold, domain, source, played_at }
 */

export interface ResultRow {
  game_id: string;
  accuracy: number;
  level: number;
  reaction_ms: number | null;
  error_rate: number | null;
  abandoned: boolean;
  adaptive_threshold: number | null;
  domain: string | null;
  source: 'game' | 'memory_chest' | string;
  played_at: string;
}

export const DOMAIN_AXES: { key: string; label: string }[] = [
  { key: 'logic', label: 'Logic' },
  { key: 'memory', label: 'Memory' },
  { key: 'spatial', label: 'Spatial' },
  { key: 'visual', label: 'Visual' },
];

const DAY = 86400000;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const startOfDay = (d: string | number | Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const weekKey = (d: string | number | Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x.getTime();
};

export function normalize(rows: any[]): ResultRow[] {
  return (rows ?? []).map((r) => ({
    ...r,
    domain: r.domain || GAME_DOMAIN[r.game_id as GameId] || 'logic',
  }));
}

export function summarize(rows: ResultRow[]) {
  const games = rows.filter((r) => r.source !== 'memory_chest');
  const completed = games.filter((r) => !r.abandoned);
  if (completed.length === 0) return null;
  const now = Date.now();
  const recent = completed.filter((r) => now - +new Date(r.played_at) < 30 * DAY);
  const older = completed.filter((r) => now - +new Date(r.played_at) >= 60 * DAY);
  const rt = (list: ResultRow[]) =>
    Math.round(avg(list.map((r) => r.reaction_ms || 0).filter(Boolean)));
  return {
    reactionNow: rt(recent) || rt(completed),
    reactionThen: rt(older) || rt(completed),
    errorRate: Math.round(avg(completed.map((r) => r.error_rate ?? (100 - r.accuracy) / 100)) * 100),
    abandonRate: Math.round((games.filter((r) => r.abandoned).length / Math.max(1, games.length)) * 100),
    threshold: Math.max(1, ...completed.map((r) => r.adaptive_threshold || r.level || 1)),
  };
}

export function radarData(rows: ResultRow[]) {
  const completed = rows.filter((r) => r.source !== 'memory_chest' && !r.abandoned);
  const now = Date.now();
  const week = completed.filter((r) => now - +new Date(r.played_at) < 7 * DAY);
  const base = completed.filter((r) => now - +new Date(r.played_at) >= 45 * DAY);
  return DOMAIN_AXES.map(({ key, label }) => ({
    key,
    label,
    week: Math.round(avg(week.filter((r) => r.domain === key).map((r) => r.accuracy))) || 0,
    baseline: Math.round(avg(base.filter((r) => r.domain === key).map((r) => r.accuracy))) || 70,
  }));
}

export function trendData(rows: ResultRow[]) {
  const completed = rows.filter((r) => r.source !== 'memory_chest' && !r.abandoned);
  const byWeek = new Map<number, { acc: number[]; rt: number[] }>();
  completed.forEach((r) => {
    const k = weekKey(r.played_at);
    if (!byWeek.has(k)) byWeek.set(k, { acc: [], rt: [] });
    byWeek.get(k)!.acc.push(r.accuracy);
    if (r.reaction_ms) byWeek.get(k)!.rt.push(r.reaction_ms);
  });
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({
      label: new Date(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      accuracy: Math.round(avg(v.acc)),
      reaction: +(avg(v.rt) / 1000).toFixed(2),
    }));
}

/** 13 weeks × 7 days. level: 0 = none, -1 = abandoned, 1..3 = sustained. */
export function heatData(rows: ResultRow[]) {
  const games = rows.filter((r) => r.source !== 'memory_chest');
  const byDay = new Map<number, { level: number; abandonedOnly: boolean }>();
  games.forEach((r) => {
    const k = startOfDay(r.played_at).getTime();
    const cur = byDay.get(k) || { level: 0, abandonedOnly: true };
    if (!r.abandoned) {
      cur.level = Math.max(cur.level, r.adaptive_threshold || r.level || 1);
      cur.abandonedOnly = false;
    }
    byDay.set(k, cur);
  });
  const weeks = 13;
  const end = startOfDay(Date.now());
  end.setDate(end.getDate() + (6 - end.getDay()));
  const cols: { level: number; date: Date; future: boolean }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: { level: number; date: Date; future: boolean }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const day = new Date(end);
      day.setDate(day.getDate() - w * 7 - (6 - dow));
      const rec = byDay.get(startOfDay(day).getTime());
      let level = 0;
      if (rec && !rec.abandonedOnly) level = rec.level;
      else if (rec && rec.abandonedOnly) level = -1;
      col.push({ level, date: day, future: day > new Date() });
    }
    cols.push(col);
  }
  return cols;
}

export function compareData(rows: ResultRow[]) {
  const games = rows.filter((r) => r.source !== 'memory_chest' && !r.abandoned);
  const chest = rows.filter((r) => r.source === 'memory_chest');
  const byWeek = new Map<number, { chest: number[]; synthetic: number[] }>();
  const add = (k: number, field: 'chest' | 'synthetic', v: number) => {
    if (!byWeek.has(k)) byWeek.set(k, { chest: [], synthetic: [] });
    byWeek.get(k)![field].push(v);
  };
  games.forEach((r) => add(weekKey(r.played_at), 'synthetic', r.accuracy));
  chest.forEach((r) => add(weekKey(r.played_at), 'chest', r.accuracy));
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-8)
    .map(([k, v]) => ({
      label: new Date(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      chest: v.chest.length ? Math.round(avg(v.chest)) : null,
      synthetic: v.synthetic.length ? Math.round(avg(v.synthetic)) : null,
    }));
}

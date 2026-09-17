import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Backend client for the patient app.
 *
 * Config comes from EXPO_PUBLIC_* env vars (Expo inlines these at build time
 * from a `.env` file at the project root):
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
 *
 * When they are absent the app runs exactly as before — fully local, seeded
 * from data/mock.ts, no network. `isRemote` gates every backend code path.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isRemote = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isRemote
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

if (!isRemote) {
  // eslint-disable-next-line no-console
  console.log('[sih] Supabase not configured — running in local-only mode.');
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('YOUR_PROJECT') &&
    supabaseAnonKey !== 'your-anon-key',
);

let client: SupabaseClient<Database> | null = null;
let accessToken: string | null = null;

export function setSupabaseAccessToken(token: string | null) {
  accessToken = token;
  // Realtime uses its own auth path (not the custom fetch wrapper).
  if (client) {
    void client.realtime.setAuth(token ?? '');
  }
}

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
    );
  }
  if (!client) {
    client = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      global: {
        fetch: async (url, options = {}) => {
          const headers = new Headers(options.headers);
          if (accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    if (accessToken) {
      void client.realtime.setAuth(accessToken);
    }
  }
  return client;
}

export function getFunctionsBaseUrl(): string {
  if (!supabaseUrl) return '';
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

const EDGE_FETCH_TIMEOUT_MS = 20_000;

export async function callEdgeFunction<T>(
  name: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  const base = getFunctionsBaseUrl();
  if (!base || !supabaseAnonKey) {
    throw new Error('Supabase functions URL not configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EDGE_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token || accessToken || supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (
      (e as { name?: string })?.name === 'AbortError' ||
      controller.signal.aborted
    ) {
      throw new Error('Network request timed out');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Edge function ${name} failed`,
    );
  }
  return data as T;
}

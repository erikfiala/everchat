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
  }
  return client;
}

export function getFunctionsBaseUrl(): string {
  if (!supabaseUrl) return '';
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

export async function callEdgeFunction<T>(
  name: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  const base = getFunctionsBaseUrl();
  if (!base || !supabaseAnonKey) {
    throw new Error('Supabase functions URL not configured');
  }
  const res = await fetch(`${base}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token || accessToken || supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Edge function ${name} failed`,
    );
  }
  return data as T;
}

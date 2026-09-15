import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { isPreviewMode } from '@/lib/preview/mode';

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
    if (isPreviewMode()) {
      throw new Error('errors.previewNoBackend');
    }
    // Official builds use .env.production; private backends: copy .env.example → .env.local.
    throw new Error('errors.supabaseNotConfigured');
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
  if (isPreviewMode()) {
    throw new Error('errors.previewNoBackend');
  }
  const base = getFunctionsBaseUrl();
  if (!base || !supabaseAnonKey) {
    throw new Error('errors.supabaseNotConfigured');
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
      throw new Error('errors.networkTimeout');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const serverError = (data as { error?: string }).error?.trim();
    // Prefer i18n-style keys from the edge function; otherwise a generic key.
    const key =
      serverError && /^[\w.-]+$/.test(serverError) && serverError.includes('.')
        ? serverError
        : 'errors.edgeFunctionFailed';
    throw new Error(key);
  }
  return data as T;
}

import { canonicalize } from './canonicalize';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** Must match SQL `last_seen >= now() - interval '2 minutes'` in page_online_counts. */
export const PRESENCE_STALE_MS = 2 * 60 * 1000;

export const PRESENCE_CANONICAL_MAX_LEN = 2048;

export function uniqueCanonicalUrls(urls: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || url.length > PRESENCE_CANONICAL_MAX_LEN) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function presenceKeyFromTabUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const canonical = canonicalize(url).canonicalUrl.trim();
  if (!canonical || canonical.length > PRESENCE_CANONICAL_MAX_LEN) return null;
  return canonical;
}

export function onlineCountsFromRows(
  rows:
    | { canonical_url: string; online_count: number | null }[]
    | null
    | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.canonical_url) continue;
    map.set(row.canonical_url, Math.max(0, row.online_count ?? 0));
  }
  return map;
}

export function applyOnlineCounts<T extends { canonical_url: string }>(
  rows: T[],
  counts: Map<string, number>,
): Array<T & { online_count: number }> {
  return rows.map((row) => ({
    ...row,
    online_count: counts.get(row.canonical_url) ?? 0,
  }));
}

export async function touchPagePresence(canonicalUrl: string): Promise<void> {
  const url = canonicalUrl.trim();
  if (!url || url.length > PRESENCE_CANONICAL_MAX_LEN) return;
  if (!isSupabaseConfigured) return;
  const { error } = await getSupabase().rpc('touch_page_presence', {
    p_canonical_url: url,
  });
  if (error) throw error;
}

export async function clearPagePresence(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await getSupabase().rpc('clear_page_presence');
  if (error) throw error;
}

export async function fetchPageOnlineCounts(
  canonicalUrls: string[],
): Promise<Map<string, number>> {
  const urls = uniqueCanonicalUrls(canonicalUrls);
  if (urls.length === 0) return new Map();
  if (!isSupabaseConfigured) return new Map();
  const { data, error } = await getSupabase().rpc('page_online_counts', {
    p_canonical_urls: urls,
  });
  if (error) throw error;
  return onlineCountsFromRows(data);
}

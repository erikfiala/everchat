import { getSupabase } from './supabase';
import type { Page } from './database.types';
import { DESCRIPTION_TRUNCATE, LIST_PAGE_SIZE } from './constants';
import { originalHref } from './canonicalize';

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '23505' ||
    (error?.message ?? '').toLowerCase().includes('duplicate key')
  );
}

function isUnknownUrlColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (msg.includes("'url'") && msg.includes('column'))
  );
}

export async function upsertPage(input: {
  canonicalUrl: string;
  url?: string | null;
  title?: string | null;
  description?: string | null;
  faviconUrl?: string | null;
}): Promise<Page> {
  const sb = getSupabase();
  const description = input.description
    ? input.description.slice(0, DESCRIPTION_TRUNCATE)
    : null;
  const url = input.url ? originalHref(input.url) : null;

  const { data: existing } = await sb
    .from('pages')
    .select('*')
    .eq('canonical_url', input.canonicalUrl)
    .maybeSingle();

  if (existing) {
    return updatePageMeta(existing, { ...input, url }, description);
  }

  const { data: created, error: insertError } = await insertPageRow({
    canonical_url: input.canonicalUrl,
    url,
    title: input.title ?? null,
    description,
    favicon_url: input.faviconUrl ?? null,
  });

  if (!insertError && created) return created;

  // Concurrent insert won the race: load + update instead of failing.
  if (isUniqueViolation(insertError)) {
    const raced = await getPageByCanonical(input.canonicalUrl);
    if (raced) return updatePageMeta(raced, { ...input, url }, description);
  }

  throw insertError ?? new Error('Could not create page room');
}

async function insertPageRow(row: {
  canonical_url: string;
  url: string | null;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
}): Promise<{ data: Page | null; error: { code?: string; message?: string } | null }> {
  const sb = getSupabase();
  const withUrl = await sb.from('pages').insert(row).select().single();
  if (!isUnknownUrlColumn(withUrl.error)) {
    return { data: withUrl.data, error: withUrl.error };
  }
  const { url: _drop, ...legacy } = row;
  const retry = await sb.from('pages').insert(legacy).select().single();
  return { data: retry.data, error: retry.error };
}

async function updatePageMeta(
  existing: Page,
  input: {
    url?: string | null;
    title?: string | null;
    faviconUrl?: string | null;
  },
  description: string | null,
): Promise<Page> {
  const sb = getSupabase();
  const nextUrl = existing.url || input.url || null;
  const patch: {
    title: string | null;
    description: string | null;
    favicon_url: string | null;
    updated_at: string;
    url?: string;
  } = {
    title: input.title || existing.title,
    description: description || existing.description,
    favicon_url: input.faviconUrl || existing.favicon_url,
    updated_at: new Date().toISOString(),
  };
  if (nextUrl && nextUrl !== existing.url) {
    patch.url = nextUrl;
  }

  const { data, error } = await sb
    .from('pages')
    .update(patch)
    .eq('id', existing.id)
    .select()
    .single();
  if (!error && data) return data;

  if (isUnknownUrlColumn(error) && patch.url) {
    const { url: _drop, ...legacy } = patch;
    const retry = await sb
      .from('pages')
      .update(legacy)
      .eq('id', existing.id)
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  if (error) throw error;
  return data;
}

export async function getPageForMessage(
  messageId: string,
): Promise<Page | null> {
  const sb = getSupabase();
  const { data: message, error } = await sb
    .from('messages')
    .select('page_id')
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!message) return null;

  const { data: page, error: pageError } = await sb
    .from('pages')
    .select('*')
    .eq('id', message.page_id)
    .maybeSingle();
  if (pageError) throw pageError;
  return page;
}

export async function getPageByCanonical(
  canonicalUrl: string,
): Promise<Page | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('pages')
    .select('*')
    .eq('canonical_url', canonicalUrl)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTrendingPages(
  limit = LIST_PAGE_SIZE,
  offset = 0,
) {
  const sb = getSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: viewData, error: viewError } = await sb
    .from('trending_pages')
    .select('*')
    .order('message_count', { ascending: false })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!viewError) {
    return viewData ?? [];
  }

  // View missing: must aggregate last-24h messages, then slice.
  // No paginated SQL aggregate without `trending_pages`.
  const { data: messages, error } = await sb
    .from('messages')
    .select(
      'page_id, pages!inner(*)',
    )
    .gte('created_at', since)
    .is('deleted_at', null);

  if (error) throw error;

  const counts = new Map<
    string,
    {
      id: string;
      canonical_url: string;
      url: string | null;
      title: string | null;
      description: string | null;
      favicon_url: string | null;
      message_count: number;
    }
  >();

  for (const row of messages || []) {
    const page = row.pages as unknown as {
      id: string;
      canonical_url: string;
      url: string | null;
      title: string | null;
      description: string | null;
      favicon_url: string | null;
    };
    if (!page) continue;
    const prev = counts.get(page.id);
    if (prev) {
      prev.message_count += 1;
    } else {
      counts.set(page.id, { ...page, message_count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.message_count - a.message_count || a.id.localeCompare(b.id))
    .slice(offset, offset + limit);
}

export type ExplorePageRow = {
  id: string;
  canonical_url: string;
  url: string | null;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  message_count: number;
  last_active_at: string | null;
};

/**
 * Recently active rooms: pages ordered by latest non-deleted message time.
 * Not “newly created empty pages” — only rooms people are chatting in.
 */
export async function getRecentlyActivePages(
  limit = LIST_PAGE_SIZE,
  opts?: { before?: string | null; excludeIds?: Iterable<string> },
): Promise<ExplorePageRow[]> {
  const sb = getSupabase();
  const excluded = new Set(opts?.excludeIds ?? []);
  const ordered: ExplorePageRow[] = [];
  const indexById = new Map<string, number>();
  let cursor = opts?.before ?? null;
  let exhausted = false;
  const batchSize = Math.max(limit * 25, 50);

  while (ordered.length < limit && !exhausted) {
    let query = sb
      .from('messages')
      .select('page_id, created_at, pages!inner(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(batchSize);
    if (cursor) query = query.lt('created_at', cursor);

    const { data: messages, error } = await query;
    if (error) throw error;
    if (!messages?.length) break;

    exhausted = messages.length < batchSize;
    const last = messages[messages.length - 1];
    if (last) cursor = last.created_at as string;

    for (const row of messages) {
      const page = row.pages as unknown as {
        id: string;
        canonical_url: string;
        url: string | null;
        title: string | null;
        description: string | null;
        favicon_url: string | null;
      };
      if (!page || excluded.has(page.id)) continue;

      const existing = indexById.get(page.id);
      if (existing != null) {
        const seen = ordered[existing];
        if (seen) seen.message_count += 1;
        continue;
      }
      if (ordered.length >= limit) continue;

      indexById.set(page.id, ordered.length);
      ordered.push({
        ...page,
        url: page.url ?? null,
        message_count: 1,
        last_active_at: row.created_at as string,
      });
    }
  }

  return ordered;
}

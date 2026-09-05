import { getSupabase } from './supabase';
import type { Page } from './database.types';
import { DESCRIPTION_TRUNCATE } from './constants';

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '23505' ||
    (error?.message ?? '').toLowerCase().includes('duplicate key')
  );
}

export async function upsertPage(input: {
  canonicalUrl: string;
  title?: string | null;
  description?: string | null;
  faviconUrl?: string | null;
}): Promise<Page> {
  const sb = getSupabase();
  const description = input.description
    ? input.description.slice(0, DESCRIPTION_TRUNCATE)
    : null;

  const { data: existing } = await sb
    .from('pages')
    .select('*')
    .eq('canonical_url', input.canonicalUrl)
    .maybeSingle();

  if (existing) {
    return updatePageMeta(existing, input, description);
  }

  const { data: created, error: insertError } = await sb
    .from('pages')
    .insert({
      canonical_url: input.canonicalUrl,
      title: input.title ?? null,
      description,
      favicon_url: input.faviconUrl ?? null,
    })
    .select()
    .single();

  if (!insertError && created) return created;

  // Concurrent insert won the race: load + update instead of failing.
  if (isUniqueViolation(insertError)) {
    const raced = await getPageByCanonical(input.canonicalUrl);
    if (raced) return updatePageMeta(raced, input, description);
  }

  throw insertError ?? new Error('Could not create page room');
}

async function updatePageMeta(
  existing: Page,
  input: {
    title?: string | null;
    faviconUrl?: string | null;
  },
  description: string | null,
): Promise<Page> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('pages')
    .update({
      title: input.title || existing.title,
      description: description || existing.description,
      favicon_url: input.faviconUrl || existing.favicon_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function getTrendingPages(limit = 10) {
  const sb = getSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Prefer view if available; fallback to aggregation query
  const { data: viewData, error: viewError } = await sb
    .from('trending_pages')
    .select('*')
    .limit(limit);

  if (!viewError && viewData && viewData.length > 0) {
    return viewData;
  }

  const { data: messages, error } = await sb
    .from('messages')
    .select(
      'page_id, pages!inner(id, canonical_url, title, description, favicon_url)',
    )
    .gte('created_at', since)
    .is('deleted_at', null);

  if (error) throw error;

  const counts = new Map<
    string,
    {
      id: string;
      canonical_url: string;
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
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, limit);
}

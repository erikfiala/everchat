import { callEdgeFunction } from './supabase';
import { AVATAR_MAX_BYTES, LIST_PAGE_SIZE } from './constants';
import { getSupabase } from './supabase';
import type { ActivityItem, Profile, WebAuthnCredential } from './database.types';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchActivity(
  userId: string,
  opts?: { limit?: number; before?: string | null },
): Promise<ActivityItem[]> {
  const limit = opts?.limit ?? LIST_PAGE_SIZE;
  const sb = getSupabase();
  let query = sb
    .from('messages')
    .select('*')
    .eq('author_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data: messages, error } = await query;
  if (error) throw error;
  if (!messages?.length) return [];

  const pageIds = [...new Set(messages.map((m) => m.page_id))];
  const { data: pages, error: pageError } = await sb
    .from('pages')
    .select('*')
    .in('id', pageIds);
  if (pageError) throw pageError;

  const byId = new Map((pages || []).map((p) => [p.id, p]));
  return messages.map((m) => ({
    ...m,
    page: byId.get(m.page_id) ?? null,
  }));
}

export async function listDevices(
  userId: string,
): Promise<
  Pick<
    WebAuthnCredential,
    'id' | 'credential_id' | 'device_label' | 'created_at' | 'last_used_at'
  >[]
> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('webauthn_credentials')
    .select('id, credential_id, device_label, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function revokeDevice(
  credentialId: string,
  userId: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId)
    .eq('user_id', userId);
  if (error) throw error;
}

export const DEVICE_LABEL_MAX_LEN = 64;
/** Short public bio — same range as a typical social about (160–280). */
export const ABOUT_MAX_LEN = 160;
export const WEBSITE_MAX_LEN = 500;

const HAS_URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Empty → null. Otherwise a normalized http(s) URL, or throws `errors.websiteInvalid`. */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > WEBSITE_MAX_LEN) {
    throw new Error('errors.websiteInvalid');
  }

  const candidate = HAS_URL_SCHEME.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('errors.websiteInvalid');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('errors.websiteInvalid');
  }
  if (url.username || url.password) {
    throw new Error('errors.websiteInvalid');
  }

  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || !host.includes('.')) {
    throw new Error('errors.websiteInvalid');
  }
  if (url.href.length > WEBSITE_MAX_LEN) {
    throw new Error('errors.websiteInvalid');
  }
  return url.href;
}

export function normalizeAbout(raw: string): string | null {
  const next = raw.trim().slice(0, ABOUT_MAX_LEN);
  return next || null;
}

/** Hostname without www, or the stored string if it is not a parseable URL. */
export function websiteDisplayLabel(website: string): string {
  try {
    const host = new URL(website).hostname.replace(/^www\./i, '');
    return host || website;
  } catch {
    return website;
  }
}

/** Open a validated profile website in a new tab (extension `browser.tabs`). */
export async function openExternalUrl(raw: string): Promise<void> {
  let href: string | null;
  try {
    href = normalizeWebsiteUrl(raw);
  } catch {
    return;
  }
  if (!href) return;
  await browser.tabs.create({ url: href });
}

export async function updateProfileAbout(
  userId: string,
  about: string,
): Promise<string | null> {
  const next = normalizeAbout(about);
  const sb = getSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ about: next })
    .eq('id', userId);
  if (error) throw error;
  return next;
}

export async function updateProfileWebsite(
  userId: string,
  website: string,
): Promise<string | null> {
  const next = normalizeWebsiteUrl(website);
  const sb = getSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ website: next })
    .eq('id', userId);
  if (error) throw error;
  return next;
}

export async function renameDevice(
  credentialId: string,
  userId: string,
  label: string,
): Promise<string> {
  const device_label = label.trim().slice(0, DEVICE_LABEL_MAX_LEN);
  if (!device_label) {
    throw new Error('errors.deviceNameRequired');
  }

  const sb = getSupabase();
  const { error } = await sb
    .from('webauthn_credentials')
    .update({ device_label })
    .eq('id', credentialId)
    .eq('user_id', userId);
  if (error) throw error;
  return device_label;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('errors.avatarTooLarge');
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('errors.avatarType');
  }

  const sb = getSupabase();
  const ext = file.type.split('/')[1] || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await sb.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error } = await sb
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (error) throw error;

  return publicUrl;
}

export async function searchGiphy(
  query: string,
  token?: string | null,
): Promise<{ id: string; url: string; preview: string; title: string }[]> {
  const data = await callEdgeFunction<{
    results: { id: string; url: string; preview: string; title: string }[];
  }>('giphy-proxy', { q: query }, token);
  return data.results || [];
}

import { callEdgeFunction } from './supabase';
import { AVATAR_MAX_BYTES } from './constants';
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
): Promise<ActivityItem[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('messages')
    .select(
      `
      *,
      page:pages!messages_page_id_fkey(id, canonical_url, title, description, favicon_url)
    `,
    )
    .eq('author_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as ActivityItem[];
}

export async function listDevices(
  userId: string,
): Promise<Pick<WebAuthnCredential, 'id' | 'device_label' | 'created_at' | 'last_used_at'>[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('webauthn_credentials')
    .select('id, device_label, created_at, last_used_at')
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
  const { count } = await sb
    .from('webauthn_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count ?? 0) <= 1) {
    throw new Error('Keep at least one device — otherwise your account is unrecoverable');
  }

  const { error } = await sb
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Avatar must be under 2 MB');
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Use JPEG, PNG, or WebP');
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

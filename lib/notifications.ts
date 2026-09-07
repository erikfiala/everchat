import { LIST_PAGE_SIZE } from './constants';
import { getSupabase } from './supabase';
import type { NotificationWithJoins } from './database.types';

const NOTIFICATION_SELECT = `
      *,
      actor:profiles!notifications_actor_id_fkey(id, username, avatar_url),
      page:pages!notifications_page_id_fkey(*)
    `;

export async function fetchNotifications(
  userId: string,
  opts?: { limit?: number; before?: string | null },
): Promise<NotificationWithJoins[]> {
  const limit = opts?.limit ?? LIST_PAGE_SIZE;
  const sb = getSupabase();
  let query = sb
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts?.before) query = query.lt('created_at', opts.before);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as NotificationWithJoins[];
}

export async function fetchNotificationById(
  id: string,
): Promise<NotificationWithJoins | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as NotificationWithJoins | null) ?? null;
}

export async function unreadCount(userId: string): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

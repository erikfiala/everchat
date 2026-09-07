import { getSupabase } from './supabase';
import type { NotificationWithJoins } from './database.types';

export async function fetchNotifications(
  userId: string,
): Promise<NotificationWithJoins[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('notifications')
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey(id, username, avatar_url),
      page:pages!notifications_page_id_fkey(*)
    `,
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as NotificationWithJoins[];
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

import type {
  RealtimeChannel,
  RealtimeChannelOptions,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { Database } from './database.types';

type Client = SupabaseClient<Database>;

export type PostgresChangeFilter = {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
};

/**
 * `supabase.channel(name)` reuses an existing topic. Calling `.on()` after
 * that channel has already `subscribe()`d throws, and a second subscribe
 * on the same topic 409s.
 *
 * Postgres-change filters are what matter, so each subscription gets a
 * unique topic. Callers must `removeChannel` the returned instance.
 */
export function subscribePostgresChanges(
  sb: Client,
  topic: string,
  filter: PostgresChangeFilter,
  onChange: (payload: { new: Record<string, unknown> }) => void,
): RealtimeChannel {
  return sb
    .channel(`${topic}:${crypto.randomUUID()}`)
    .on('postgres_changes', filter, (payload) => {
      onChange(payload as { new: Record<string, unknown> });
    })
    .subscribe();
}

/**
 * Presence rooms must share a topic. Tear down any leftover channel on
 * that topic before creating a fresh one so `.on()` never runs after
 * `subscribe()`.
 */
export async function claimRealtimeChannel(
  sb: Client,
  topic: string,
  options?: RealtimeChannelOptions,
): Promise<RealtimeChannel> {
  const realtimeTopic = topic.startsWith('realtime:')
    ? topic
    : `realtime:${topic}`;
  const existing = sb
    .getChannels()
    .filter((channel) => channel.topic === realtimeTopic);
  await Promise.all(existing.map((channel) => sb.removeChannel(channel)));
  return sb.channel(topic, options);
}

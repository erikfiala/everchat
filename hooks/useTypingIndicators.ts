import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface TypingUser {
  id: string;
  username: string;
}

type PresenceMeta = {
  user_id?: string;
  username?: string;
  typing?: boolean;
};

function collectTypers(
  state: Record<string, PresenceMeta[]>,
  excludeUserId?: string | null,
): TypingUser[] {
  const byId = new Map<string, TypingUser>();
  for (const metas of Object.values(state)) {
    const meta = metas[0];
    if (!meta?.typing || !meta.user_id || !meta.username) continue;
    if (excludeUserId && meta.user_id === excludeUserId) continue;
    byId.set(meta.user_id, { id: meta.user_id, username: meta.username });
  }
  return [...byId.values()];
}

/**
 * Ephemeral typing presence for a page room.
 * Anyone with pageId can subscribe (lurkers included); only signed-in
 * users with a username publish via `setLocalTyping`.
 */
export function useTypingIndicators(
  pageId: string | null,
  user: { id: string; username: string } | null | undefined,
) {
  const [typers, setTypers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const typingRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!pageId || !isSupabaseConfigured) {
      setTypers([]);
      return;
    }

    const sb = getSupabase();
    const channel = sb.channel(`page:${pageId}:typing`, {
      config: {
        presence: {
          key: user?.id ?? `lurker:${crypto.randomUUID()}`,
        },
      },
    });
    channelRef.current = channel;
    readyRef.current = false;
    typingRef.current = false;

    const sync = () => {
      setTypers(
        collectTypers(
          channel.presenceState() as Record<string, PresenceMeta[]>,
          userRef.current?.id,
        ),
      );
    };

    const publishIfTyping = () => {
      const current = userRef.current;
      if (!typingRef.current || !current?.username) return;
      void channel.track({
        user_id: current.id,
        username: current.username,
        typing: true,
      });
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        readyRef.current = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') publishIfTyping();
      });

    return () => {
      typingRef.current = false;
      readyRef.current = false;
      channelRef.current = null;
      try {
        void channel.untrack();
      } catch {
        /* ignore */
      }
      try {
        sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
      setTypers([]);
    };
  }, [pageId, user?.id]);

  const setLocalTyping = useCallback((typing: boolean) => {
    const channel = channelRef.current;
    const current = userRef.current;
    if (!channel || !current?.username) return;
    if (typing === typingRef.current) return;
    typingRef.current = typing;
    if (!readyRef.current) return;
    if (typing) {
      void channel.track({
        user_id: current.id,
        username: current.username,
        typing: true,
      });
    } else {
      void channel.untrack();
    }
  }, []);

  return { typers, setLocalTyping };
}

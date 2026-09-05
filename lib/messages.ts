import { getSupabase } from './supabase';
import type {
  MessageNode,
  MessageWithAuthor,
  SortMode,
  Vote,
} from './database.types';
import { MAX_BODY_LENGTH, RATE_LIMIT_POSTS_PER_MINUTE } from './constants';

export async function fetchMessagesForPage(
  pageId: string,
  userId?: string | null,
): Promise<{ messages: MessageWithAuthor[]; votes: Vote[] }> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('messages')
    .select(
      `
      *,
      author:profiles!messages_author_id_fkey(id, username, avatar_url, karma)
    `,
    )
    .eq('page_id', pageId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  let votes: Vote[] = [];
  if (userId) {
    const { data: voteData } = await sb
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .in(
        'message_id',
        (data || []).map((m) => m.id),
      );
    votes = voteData || [];
  }

  return {
    messages: (data || []) as MessageWithAuthor[],
    votes,
  };
}

export function buildMessageTree(
  messages: MessageWithAuthor[],
  votes: Vote[],
  sort: SortMode,
): MessageNode[] {
  const voteMap = new Map(votes.map((v) => [v.message_id, v.value]));
  const nodes = new Map<string, MessageNode>();

  for (const m of messages) {
    nodes.set(m.id, {
      ...m,
      children: [],
      myVote: voteMap.get(m.id) ?? null,
    });
  }

  // Orphan replies whose parent row is gone: synthesize a deleted placeholder
  // so the tree stays nested under italic "Deleted comment."
  for (const node of [...nodes.values()]) {
    if (!node.parent_id || nodes.has(node.parent_id)) continue;
    nodes.set(node.parent_id, {
      id: node.parent_id,
      page_id: node.page_id,
      author_id: node.author_id,
      parent_id: null,
      body: '',
      gif_url: null,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      deleted_at: new Date(0).toISOString(),
      created_at: node.created_at,
      author: null,
      children: [],
      myVote: null,
    });
  }

  const roots: MessageNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sorter = (a: MessageNode, b: MessageNode) => {
    if (sort === 'best') {
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const sortRecursive = (list: MessageNode[]) => {
    list.sort(sorter);
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}

export async function createMessage(input: {
  pageId: string;
  authorId: string;
  parentId?: string | null;
  body: string;
  gifUrl?: string | null;
}): Promise<MessageWithAuthor> {
  if (!input.body.trim() && !input.gifUrl) {
    throw new Error('errors.messageNeedsContent');
  }
  if (input.body.length > MAX_BODY_LENGTH) {
    const err = new Error('errors.messageMaxLength');
    (
      err as Error & { i18nVars?: Record<string, string | number> }
    ).i18nVars = { max: MAX_BODY_LENGTH };
    throw err;
  }

  const sb = getSupabase();

  const { data: allowed, error: rlError } = await sb.rpc('check_rate_limit', {
    p_user_id: input.authorId,
    p_action: 'post',
    p_limit: RATE_LIMIT_POSTS_PER_MINUTE,
  });
  if (rlError) throw rlError;
  if (allowed === false) {
    throw new Error('errors.rateLimitPost');
  }

  const { data, error } = await sb
    .from('messages')
    .insert({
      page_id: input.pageId,
      author_id: input.authorId,
      parent_id: input.parentId ?? null,
      body: input.body,
      gif_url: input.gifUrl ?? null,
    })
    .select(
      `
      *,
      author:profiles!messages_author_id_fkey(id, username, avatar_url, karma)
    `,
    )
    .single();

  if (error) throw error;
  return data as MessageWithAuthor;
}

export async function deleteMessage(messageId: string): Promise<'deleted' | 'tombstone'> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('delete_own_message', {
    p_message_id: messageId,
  });
  if (error) throw error;
  return (data as 'deleted' | 'tombstone') || 'deleted';
}

export async function reportMessage(
  messageId: string,
  reporterId: string,
  reason?: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('reports').insert({
    message_id: messageId,
    reporter_id: reporterId,
    reason: reason ?? null,
  });
  if (error) throw error;
}

export function findPathToMessage(
  roots: MessageNode[],
  targetId: string,
): string[] | null {
  const path: string[] = [];
  const walk = (nodes: MessageNode[]): boolean => {
    for (const n of nodes) {
      path.push(n.id);
      if (n.id === targetId) return true;
      if (walk(n.children)) return true;
      path.pop();
    }
    return false;
  };
  return walk(roots) ? path : null;
}

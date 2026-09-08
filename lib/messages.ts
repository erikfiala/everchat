import { getSupabase } from './supabase';
import type {
  MessageNode,
  MessageWithAuthor,
  SortMode,
  Vote,
} from './database.types';
import { LIST_PAGE_SIZE, MAX_BODY_LENGTH } from './constants';
import { chunkIds, pageHasMore } from './listPage';

const MESSAGE_WITH_AUTHOR = `
      *,
      author:profiles!messages_author_id_fkey(id, username, avatar_url, karma)
    `;

export type MessagePage = {
  messages: MessageWithAuthor[];
  votes: Vote[];
  rootCount: number;
  hasMore: boolean;
};

export async function fetchVotesForMessages(
  userId: string | null | undefined,
  messageIds: string[],
): Promise<Vote[]> {
  if (!userId || !messageIds.length) return [];
  const sb = getSupabase();
  const votes: Vote[] = [];
  for (const batch of chunkIds(messageIds)) {
    const { data, error } = await sb
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .in('message_id', batch);
    if (error) throw error;
    votes.push(...(data || []));
  }
  return votes;
}

export async function fetchMessageWithAuthor(
  id: string,
): Promise<MessageWithAuthor | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('messages')
    .select(MESSAGE_WITH_AUTHOR)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as MessageWithAuthor | null) ?? null;
}

async function fetchDescendantMessages(
  pageId: string,
  rootIds: string[],
): Promise<MessageWithAuthor[]> {
  if (!rootIds.length) return [];
  const sb = getSupabase();
  const found: MessageWithAuthor[] = [];
  let frontier = rootIds;
  const seen = new Set(rootIds);

  while (frontier.length) {
    const next: string[] = [];
    for (const batch of chunkIds(frontier)) {
      const { data, error } = await sb
        .from('messages')
        .select(MESSAGE_WITH_AUTHOR)
        .eq('page_id', pageId)
        .in('parent_id', batch);
      if (error) throw error;
      for (const row of (data || []) as MessageWithAuthor[]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        found.push(row);
        next.push(row.id);
      }
    }
    frontier = next;
  }
  return found;
}

/** Root threads (page size) plus their reply trees — not the whole room. */
export async function fetchMessagesForPage(
  pageId: string,
  userId?: string | null,
  page?: { sort: SortMode; offset?: number; limit?: number },
): Promise<MessagePage> {
  const sort = page?.sort ?? 'new';
  const limit = page?.limit ?? LIST_PAGE_SIZE;
  const offset = page?.offset ?? 0;
  const sb = getSupabase();

  let rootQuery = sb
    .from('messages')
    .select(MESSAGE_WITH_AUTHOR)
    .eq('page_id', pageId)
    .is('parent_id', null);

  if (sort === 'best') {
    rootQuery = rootQuery
      .order('score', { ascending: false })
      .order('created_at', { ascending: false });
  } else {
    rootQuery = rootQuery.order('created_at', { ascending: false });
  }

  const { data: roots, error } = await rootQuery.range(
    offset,
    offset + limit - 1,
  );
  if (error) throw error;

  const rootRows = (roots || []) as MessageWithAuthor[];
  const descendants = await fetchDescendantMessages(
    pageId,
    rootRows.map((row) => row.id),
  );
  const messages = [...rootRows, ...descendants];
  const votes = await fetchVotesForMessages(
    userId,
    messages.map((row) => row.id),
  );

  return {
    messages,
    votes,
    rootCount: rootRows.length,
    hasMore: pageHasMore(rootRows.length, limit),
  };
}

/** Load the root thread that contains `messageId` (deep-link / focus). */
export async function fetchThreadContainingMessage(
  pageId: string,
  messageId: string,
  userId?: string | null,
): Promise<MessagePage | null> {
  const start = await fetchMessageWithAuthor(messageId);
  if (!start || start.page_id !== pageId) return null;

  let root = start;
  const seen = new Set([start.id]);
  while (root.parent_id && !seen.has(root.parent_id)) {
    seen.add(root.parent_id);
    const parent = await fetchMessageWithAuthor(root.parent_id);
    if (!parent) break;
    root = parent;
  }

  const descendants = await fetchDescendantMessages(pageId, [root.id]);
  const byId = new Map<string, MessageWithAuthor>();
  byId.set(root.id, root);
  for (const row of descendants) byId.set(row.id, row);
  const messages = [...byId.values()];
  const votes = await fetchVotesForMessages(
    userId,
    messages.map((row) => row.id),
  );

  return { messages, votes, rootCount: 1, hasMore: false };
}

export function buildMessageTree(
  messages: MessageWithAuthor[],
  votes: Vote[],
  sort: SortMode,
): MessageNode[] {
  const voteMap = new Map(votes.map((v) => [v.message_id, v.value]));
  const nodes = new Map<string, MessageNode>();

  for (const m of messages) {
    const deleted = Boolean(m.deleted_at);
    nodes.set(m.id, {
      ...m,
      // Tombstones keep author_id for the row, but never expose the poster.
      author: deleted ? null : m.author,
      children: [],
      myVote: voteMap.get(m.id) ?? null,
    });
  }

  // Orphan replies whose parent row is gone: synthesize a deleted placeholder
  // so the tree stays nested under the reserved @anonymous row.
  for (const node of [...nodes.values()]) {
    if (!node.parent_id || nodes.has(node.parent_id)) continue;
    nodes.set(node.parent_id, {
      id: node.parent_id,
      page_id: node.page_id,
      author_id: '',
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
  return pruneEmptyDeleted(roots);
}

/** Drop deleted nodes that have no remaining live replies in the thread. */
function pruneEmptyDeleted(nodes: MessageNode[]): MessageNode[] {
  const kept: MessageNode[] = [];
  for (const node of nodes) {
    const children = pruneEmptyDeleted(node.children);
    if (node.deleted_at && children.length === 0) continue;
    node.children = children;
    kept.push(node);
  }
  return kept;
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
    p_action: 'post',
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

export function findMessageNode(
  roots: MessageNode[],
  targetId: string,
): MessageNode | null {
  for (const node of roots) {
    if (node.id === targetId) return node;
    const found = findMessageNode(node.children, targetId);
    if (found) return found;
  }
  return null;
}

/**
 * Stack of conversation parents to open so the focused message is visible
 * as a reply in its parent pane. Roots stay on the main feed.
 */
export function conversationStackForFocus(path: string[] | null): string[] {
  if (!path || path.length <= 1) return [];
  return path.slice(0, -1);
}

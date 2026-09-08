import { HANDLE_MAX } from '@/lib/constants';
import type { MessageNode } from '@/lib/database.types';
import { isAnonymousHandle } from '@/lib/profile';

export interface MentionParticipant {
  username: string;
  avatarUrl: string | null;
}

export interface MentionQuery {
  /** Index of the `@` that starts this mention. */
  start: number;
  query: string;
}

const HANDLE_CHAR = /[a-z0-9_]/i;

/** Unique live authors on this page (nested replies included). */
export function collectMentionParticipants(
  roots: MessageNode[],
): MentionParticipant[] {
  const byHandle = new Map<string, MentionParticipant>();

  const walk = (nodes: MessageNode[]) => {
    for (const node of nodes) {
      if (!node.deleted_at) {
        const raw = node.author?.username?.trim().toLowerCase() ?? '';
        if (raw && !isAnonymousHandle(raw)) {
          if (!byHandle.has(raw)) {
            byHandle.set(raw, {
              username: raw,
              avatarUrl: node.author?.avatar_url ?? null,
            });
          }
        }
      }
      if (node.children.length) walk(node.children);
    }
  };

  walk(roots);
  return [...byHandle.values()].sort((a, b) =>
    a.username.localeCompare(b.username),
  );
}

/**
 * Active `@query` immediately before the caret.
 * Ignores email-like tokens (`hello@bob`) and leftover `@` after a space.
 */
export function findMentionQuery(
  text: string,
  caret: number,
): MentionQuery | null {
  const pos = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, pos);
  let i = before.length - 1;
  let queryChars = 0;
  while (i >= 0 && HANDLE_CHAR.test(before[i]!) && queryChars < HANDLE_MAX) {
    i -= 1;
    queryChars += 1;
  }
  if (i < 0 || before[i] !== '@') return null;
  const prev = i === 0 ? '' : before[i - 1]!;
  if (prev && HANDLE_CHAR.test(prev)) return null;
  return {
    start: i,
    query: before.slice(i + 1).toLowerCase(),
  };
}

export function filterMentionParticipants(
  participants: MentionParticipant[],
  query: string,
): MentionParticipant[] {
  const q = query.trim().toLowerCase();
  if (!q) return participants;
  return participants.filter((p) => p.username.startsWith(q));
}

export function insertMention(
  text: string,
  caret: number,
  mentionStart: number,
  username: string,
  maxLen: number,
): { text: string; caret: number } {
  const start = Math.max(0, mentionStart);
  const pos = Math.max(start, Math.min(caret, text.length));
  const before = text.slice(0, start);
  const after = text.slice(pos);
  const needsSpace = after.length === 0 || !/^\s/.test(after);
  const insertion = `@${username}${needsSpace ? ' ' : ''}`;
  const next = (before + insertion + after).slice(0, maxLen);
  let newCaret = Math.min(before.length + insertion.length, next.length);
  if (!needsSpace && newCaret < next.length && /\s/.test(next[newCaret]!)) {
    newCaret += 1;
  }
  return { text: next, caret: Math.min(newCaret, next.length) };
}

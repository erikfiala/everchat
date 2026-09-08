import { describe, expect, it } from 'vitest';
import {
  buildMessageTree,
  conversationStackForFocus,
  findMessageNode,
  findPathToMessage,
} from './messages';
import type { MessageWithAuthor } from './database.types';

function msg(
  overrides: Partial<MessageWithAuthor> & Pick<MessageWithAuthor, 'id'>,
): MessageWithAuthor {
  return {
    page_id: 'page',
    author_id: 'author',
    parent_id: null,
    body: 'hello',
    gif_url: null,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    author: {
      id: 'author',
      username: 'alice',
      avatar_url: null,
      karma: 0,
    },
    ...overrides,
  };
}

describe('buildMessageTree deleted nodes', () => {
  it('omits a deleted message with no replies', () => {
    const roots = buildMessageTree(
      [
        msg({ id: 'live', body: 'still here' }),
        msg({ id: 'gone', body: '', deleted_at: '2026-01-02T00:00:00.000Z' }),
      ],
      [],
      'new',
    );
    expect(roots.map((n) => n.id)).toEqual(['live']);
  });

  it('keeps a deleted parent so remaining replies stay nested', () => {
    const roots = buildMessageTree(
      [
        msg({ id: 'parent', body: '', deleted_at: '2026-01-02T00:00:00.000Z' }),
        msg({ id: 'child', parent_id: 'parent', body: 'reply' }),
      ],
      [],
      'new',
    );
    expect(roots).toHaveLength(1);
    expect(roots[0]?.id).toBe('parent');
    expect(roots[0]?.deleted_at).toBeTruthy();
    expect(roots[0]?.author).toBeNull();
    expect(roots[0]?.children.map((n) => n.id)).toEqual(['child']);
    expect(roots[0]?.children[0]?.author?.username).toBe('alice');
  });

  it('does not attach a reply author to a missing deleted parent', () => {
    const roots = buildMessageTree(
      [
        msg({
          id: 'child',
          parent_id: 'missing',
          body: 'reply',
          author_id: 'child-author',
          author: {
            id: 'child-author',
            username: 'bob',
            avatar_url: 'https://example.com/bob.png',
            karma: 3,
          },
        }),
      ],
      [],
      'new',
    );
    expect(roots[0]?.id).toBe('missing');
    expect(roots[0]?.deleted_at).toBeTruthy();
    expect(roots[0]?.author).toBeNull();
    expect(roots[0]?.author_id).toBe('');
    expect(roots[0]?.children[0]?.author?.username).toBe('bob');
  });

  it('drops a chain of deleted nodes with no live descendant', () => {
    const roots = buildMessageTree(
      [
        msg({ id: 'a', body: '', deleted_at: '2026-01-02T00:00:00.000Z' }),
        msg({
          id: 'b',
          parent_id: 'a',
          body: '',
          deleted_at: '2026-01-03T00:00:00.000Z',
        }),
      ],
      [],
      'new',
    );
    expect(roots).toEqual([]);
  });

  it('keeps deleted ancestors of a live nested reply', () => {
    const roots = buildMessageTree(
      [
        msg({ id: 'a', body: '', deleted_at: '2026-01-02T00:00:00.000Z' }),
        msg({
          id: 'b',
          parent_id: 'a',
          body: '',
          deleted_at: '2026-01-03T00:00:00.000Z',
        }),
        msg({ id: 'c', parent_id: 'b', body: 'still here' }),
      ],
      [],
      'new',
    );
    expect(roots[0]?.id).toBe('a');
    expect(roots[0]?.children[0]?.id).toBe('b');
    expect(roots[0]?.children[0]?.children[0]?.id).toBe('c');
  });

  it('omits a deleted reply under a live parent', () => {
    const roots = buildMessageTree(
      [
        msg({ id: 'parent', body: 'root' }),
        msg({
          id: 'gone',
          parent_id: 'parent',
          body: '',
          deleted_at: '2026-01-02T00:00:00.000Z',
        }),
      ],
      [],
      'new',
    );
    expect(roots[0]?.id).toBe('parent');
    expect(roots[0]?.children).toEqual([]);
  });
});

describe('thread navigation helpers', () => {
  const tree = buildMessageTree(
    [
      msg({ id: 'root', body: 'root' }),
      msg({ id: 'child', parent_id: 'root', body: 'child' }),
      msg({ id: 'grand', parent_id: 'child', body: 'grand' }),
    ],
    [],
    'new',
  );

  it('finds a nested node by id', () => {
    expect(findMessageNode(tree, 'grand')?.body).toBe('grand');
    expect(findMessageNode(tree, 'missing')).toBeNull();
  });

  it('returns the path from root to the target', () => {
    expect(findPathToMessage(tree, 'grand')).toEqual(['root', 'child', 'grand']);
    expect(findPathToMessage(tree, 'root')).toEqual(['root']);
    expect(findPathToMessage(tree, 'missing')).toBeNull();
  });

  it('opens ancestor conversations so the focused reply is visible', () => {
    expect(conversationStackForFocus(['root', 'child', 'grand'])).toEqual([
      'root',
      'child',
    ]);
    expect(conversationStackForFocus(['root'])).toEqual([]);
    expect(conversationStackForFocus(null)).toEqual([]);
  });
});

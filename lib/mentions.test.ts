import { describe, expect, it } from 'vitest';
import type { MessageNode } from './database.types';
import {
  collectMentionParticipants,
  filterMentionParticipants,
  findMentionQuery,
  insertMention,
} from './mentions';

function node(
  overrides: Partial<MessageNode> & Pick<MessageNode, 'id'>,
): MessageNode {
  return {
    page_id: 'page',
    author_id: overrides.author?.id ?? 'author',
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
    children: [],
    myVote: null,
    ...overrides,
  };
}

describe('collectMentionParticipants', () => {
  it('collects unique live handles including nested replies', () => {
    const roots = [
      node({
        id: 'a',
        author: { id: '1', username: 'Zoe', avatar_url: 'z.png', karma: 1 },
        children: [
          node({
            id: 'b',
            author: { id: '2', username: 'bob', avatar_url: null, karma: 0 },
          }),
          node({
            id: 'c',
            author: { id: '1', username: 'zoe', avatar_url: 'z.png', karma: 1 },
          }),
        ],
      }),
    ];
    expect(collectMentionParticipants(roots)).toEqual([
      { username: 'bob', avatarUrl: null },
      { username: 'zoe', avatarUrl: 'z.png' },
    ]);
  });

  it('skips deleted comments, missing authors, and @anonymous', () => {
    const roots = [
      node({
        id: 'gone',
        deleted_at: '2026-01-02T00:00:00.000Z',
        author: { id: 'old', username: 'oldhandle', avatar_url: null, karma: 0 },
        children: [
          node({
            id: 'anon',
            author: {
              id: 'anonymous',
              username: 'anonymous',
              avatar_url: null,
              karma: 0,
            },
          }),
          node({ id: 'no-author', author: null }),
          node({
            id: 'live',
            author: { id: '3', username: 'cara', avatar_url: null, karma: 0 },
          }),
        ],
      }),
    ];
    expect(collectMentionParticipants(roots)).toEqual([
      { username: 'cara', avatarUrl: null },
    ]);
  });
});

describe('findMentionQuery', () => {
  it('finds @ at the start, after a space, and mid-sentence', () => {
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(findMentionQuery('hey @al', 7)).toEqual({ start: 4, query: 'al' });
    expect(findMentionQuery('thanks @bob for', 11)).toEqual({
      start: 7,
      query: 'bob',
    });
  });

  it('ignores email-like @ and leftover @ after whitespace', () => {
    expect(findMentionQuery('hello@bob', 9)).toBeNull();
    expect(findMentionQuery('hey @bob thanks', 15)).toBeNull();
  });
});

describe('filterMentionParticipants', () => {
  const people = [
    { username: 'alice', avatarUrl: null },
    { username: 'bob', avatarUrl: null },
    { username: 'alicia', avatarUrl: null },
  ];

  it('returns everyone for an empty query and prefix-filters as they type', () => {
    expect(filterMentionParticipants(people, '').map((p) => p.username)).toEqual(
      ['alice', 'bob', 'alicia'],
    );
    expect(
      filterMentionParticipants(people, 'ALI').map((p) => p.username),
    ).toEqual(['alice', 'alicia']);
    expect(filterMentionParticipants(people, 'zz')).toEqual([]);
  });
});

describe('insertMention', () => {
  it('replaces the active query with @handle and a trailing space', () => {
    expect(insertMention('hey @al', 7, 4, 'alice', 300)).toEqual({
      text: 'hey @alice ',
      caret: 11,
    });
  });

  it('does not add a second space when one already follows', () => {
    expect(insertMention('hey @al there', 7, 4, 'alice', 300)).toEqual({
      text: 'hey @alice there',
      caret: 11,
    });
  });

  it('respects the max body length', () => {
    const result = insertMention('@a', 2, 0, 'alice', 5);
    expect(result.text.length).toBeLessThanOrEqual(5);
    expect(result.text.startsWith('@')).toBe(true);
  });
});

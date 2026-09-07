import { describe, expect, it } from 'vitest';
import {
  appendUniqueById,
  chunkIds,
  pageHasMore,
  prependUniqueById,
} from './listPage';

const id = (item: { id: string }) => item.id;

describe('appendUniqueById', () => {
  it('appends unseen items and skips duplicates', () => {
    const existing = [{ id: 'a' }, { id: 'b' }];
    expect(
      appendUniqueById(existing, [{ id: 'b' }, { id: 'c' }], id),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('returns the same array when nothing new arrives', () => {
    const existing = [{ id: 'a' }];
    expect(appendUniqueById(existing, [{ id: 'a' }], id)).toBe(existing);
  });
});

describe('prependUniqueById', () => {
  it('prepends unseen items without duplicating', () => {
    const existing = [{ id: 'b' }, { id: 'c' }];
    expect(
      prependUniqueById(existing, [{ id: 'a' }, { id: 'b' }], id),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });
});

describe('pageHasMore', () => {
  it('is true only when a full page came back', () => {
    expect(pageHasMore(20)).toBe(true);
    expect(pageHasMore(19)).toBe(false);
    expect(pageHasMore(5, 5)).toBe(true);
  });
});

describe('chunkIds', () => {
  it('splits ids into batches', () => {
    expect(chunkIds(['a', 'b', 'c', 'd'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

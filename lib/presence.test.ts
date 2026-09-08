import { describe, expect, it } from 'vitest';
import {
  applyOnlineCountChange,
  applyOnlineCounts,
  fetchPageOnlineCounts,
  onlineCountsFromRows,
  presenceKeyFromTabUrl,
  uniqueCanonicalUrls,
} from './presence';

describe('uniqueCanonicalUrls', () => {
  it('trims, drops empties, and dedupes in first-seen order', () => {
    expect(
      uniqueCanonicalUrls([' a.com/ ', '', 'b.com/', 'a.com/', '   ']),
    ).toEqual(['a.com/', 'b.com/']);
  });
});

describe('onlineCountsFromRows', () => {
  it('merges RPC rows into a map; later duplicates win', () => {
    expect(
      onlineCountsFromRows([
        { canonical_url: 'a.com/', online_count: 3 },
        { canonical_url: 'b.com/', online_count: 0 },
        { canonical_url: 'a.com/', online_count: 1 },
        { canonical_url: '', online_count: 9 },
      ]),
    ).toEqual(
      new Map([
        ['a.com/', 1],
        ['b.com/', 0],
      ]),
    );
  });

  it('treats null/empty input as an empty map', () => {
    expect(onlineCountsFromRows(null)).toEqual(new Map());
    expect(onlineCountsFromRows(undefined)).toEqual(new Map());
    expect(onlineCountsFromRows([])).toEqual(new Map());
  });
});

describe('applyOnlineCounts', () => {
  it('sets online_count from the map and defaults missing urls to 0', () => {
    const rows = [
      { id: '1', canonical_url: 'extensions/', message_count: 40 },
      { id: '2', canonical_url: 'example.com/', message_count: 2 },
    ];
    expect(
      applyOnlineCounts(rows, new Map([['extensions/', 4]])),
    ).toEqual([
      { id: '1', canonical_url: 'extensions/', message_count: 40, online_count: 4 },
      { id: '2', canonical_url: 'example.com/', message_count: 2, online_count: 0 },
    ]);
  });
});

describe('applyOnlineCountChange', () => {
  const rows = [
    { id: '1', canonical_url: 'extensions/', online_count: 1 },
    { id: '2', canonical_url: 'example.com/', online_count: 0 },
  ];

  it('patches insert/update onto a listed url and ignores unknown urls', () => {
    expect(
      applyOnlineCountChange(rows, {
        eventType: 'INSERT',
        new: { canonical_url: 'extensions/', online_count: 4 },
      }),
    ).toEqual([
      { id: '1', canonical_url: 'extensions/', online_count: 4 },
      { id: '2', canonical_url: 'example.com/', online_count: 0 },
    ]);
    expect(
      applyOnlineCountChange(rows, {
        eventType: 'UPDATE',
        new: { canonical_url: 'other.com/', online_count: 9 },
      }),
    ).toBe(rows);
  });

  it('sets 0 on DELETE using payload.old', () => {
    expect(
      applyOnlineCountChange(rows, {
        eventType: 'DELETE',
        new: {},
        old: { canonical_url: 'extensions/' },
      }),
    ).toEqual([
      { id: '1', canonical_url: 'extensions/', online_count: 0 },
      { id: '2', canonical_url: 'example.com/', online_count: 0 },
    ]);
  });
});

describe('fetchPageOnlineCounts', () => {
  it('short-circuits an empty or blank url list without hitting the network', async () => {
    await expect(fetchPageOnlineCounts([])).resolves.toEqual(new Map());
    await expect(fetchPageOnlineCounts(['', '   '])).resolves.toEqual(new Map());
  });
});

describe('presenceKeyFromTabUrl', () => {
  it('uses the same scheme-less identity as canonicalize, including chrome-internal pages', () => {
    expect(presenceKeyFromTabUrl('chrome://extensions/')).toBe('extensions/');
    expect(
      presenceKeyFromTabUrl('https://www.Example.com/foo/?utm_source=x'),
    ).toBe('example.com/foo');
  });

  it('returns null when there is no usable url', () => {
    expect(presenceKeyFromTabUrl(null)).toBeNull();
    expect(presenceKeyFromTabUrl('')).toBeNull();
    expect(presenceKeyFromTabUrl('   ')).toBeNull();
  });
});

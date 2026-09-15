import { describe, expect, it } from 'vitest';
import {
  extractGiphyId,
  giphyGifUrl,
  giphyPreviewUrl,
  normalizeGifPreviewUrl,
  normalizeGifUrl,
} from './giphy';

const STORED_V1 =
  'https://media4.giphy.com/media/v1.Y2lkPTE2OTBjYWU4OWVoZWl1MDQ2d242dTRxbDhwamk4NzRsenFqZ2Vxa3BmcnVsOXZ2bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/44Eq3Ab5LPYn6/giphy.gif';
const ID = '44Eq3Ab5LPYn6';

describe('extractGiphyId', () => {
  it('reads the id from an API original.url (v1.Y2lk + optional cid)', () => {
    expect(extractGiphyId(STORED_V1)).toBe(ID);
    expect(
      extractGiphyId(
        `${STORED_V1}?cid=ec5b98c0abc&ep=v1_gifs_search&rid=giphy.gif&ct=g`,
      ),
    ).toBe(ID);
  });

  it('reads classic media and i.giphy.com embed URLs', () => {
    expect(
      extractGiphyId(`https://media.giphy.com/media/${ID}/giphy.gif`),
    ).toBe(ID);
    expect(
      extractGiphyId(`https://media0.giphy.com/media/${ID}/200w.gif`),
    ).toBe(ID);
    expect(extractGiphyId(`https://i.giphy.com/${ID}.gif`)).toBe(ID);
    expect(
      extractGiphyId(`https://i.giphy.com/media/${ID}/giphy.gif`),
    ).toBe(ID);
  });

  it('reads giphy.com page and embed paths', () => {
    expect(extractGiphyId(`https://giphy.com/gifs/thank-you-${ID}`)).toBe(ID);
    expect(extractGiphyId(`https://giphy.com/embed/${ID}`)).toBe(ID);
  });

  it('rejects non-Giphy and unusable values', () => {
    expect(extractGiphyId('https://example.com/cat.gif')).toBeNull();
    expect(extractGiphyId('not a url')).toBeNull();
    expect(extractGiphyId('')).toBeNull();
  });
});

describe('normalizeGifUrl / normalizeGifPreviewUrl', () => {
  it('rewrites API CDN URLs to stable i.giphy.com embeds', () => {
    expect(normalizeGifUrl(STORED_V1)).toBe(giphyGifUrl(ID));
    expect(normalizeGifPreviewUrl(STORED_V1)).toBe(giphyPreviewUrl(ID));
    expect(giphyGifUrl(ID)).toBe(`https://i.giphy.com/${ID}.gif`);
    expect(giphyPreviewUrl(ID)).toBe(
      `https://i.giphy.com/media/${ID}/200w.gif`,
    );
  });

  it('is a no-op for an already-stable original URL', () => {
    const stable = `https://i.giphy.com/${ID}.gif`;
    expect(normalizeGifUrl(stable)).toBe(stable);
  });

  it('passes through non-Giphy http(s) URLs and clears blanks', () => {
    expect(normalizeGifUrl('https://cdn.example.com/a.gif')).toBe(
      'https://cdn.example.com/a.gif',
    );
    expect(normalizeGifUrl('  ')).toBeNull();
    expect(normalizeGifUrl(null)).toBeNull();
  });
});

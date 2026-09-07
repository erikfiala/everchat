import { LIST_PAGE_SIZE } from './constants';

export { LIST_PAGE_SIZE };

export function appendUniqueById<T>(
  existing: T[],
  incoming: T[],
  getId: (item: T) => string,
): T[] {
  if (!incoming.length) return existing;
  const seen = new Set(existing.map(getId));
  const extra = incoming.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!extra.length) return existing;
  return [...existing, ...extra];
}

export function prependUniqueById<T>(
  existing: T[],
  incoming: T[],
  getId: (item: T) => string,
): T[] {
  if (!incoming.length) return existing;
  const seen = new Set(existing.map(getId));
  const extra = incoming.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!extra.length) return existing;
  return [...extra, ...existing];
}

export function pageHasMore(
  pageLength: number,
  pageSize: number = LIST_PAGE_SIZE,
): boolean {
  return pageLength >= pageSize;
}

export function chunkIds(ids: string[], size = 50): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

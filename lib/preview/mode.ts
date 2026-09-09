export function isPreviewMode(): boolean {
  return typeof window !== 'undefined' && window.__EC_PREVIEW__ === true;
}

declare global {
  interface Window {
    __EC_PREVIEW__?: boolean;
  }
}

export function isWebApp(): boolean {
  return typeof window !== 'undefined' && window.__EC_WEBAPP__ === true;
}

declare global {
  interface Window {
    __EC_WEBAPP__?: boolean;
  }
}

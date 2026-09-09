import { installPreviewChrome } from '@/lib/preview/chrome';

window.__EC_PREVIEW__ = true;
installPreviewChrome();

await import('./app');

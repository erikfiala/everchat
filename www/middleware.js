import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: [
    '/m',
    '/m/:id',
    '/themes/:id',
    // SPA deep links — vercel.json rewrites do not apply on this static output.
    '/app/p/:path*',
    '/chat',
    '/chat/:path*',
  ],
};

/**
 * vercel.json rewrites do not apply on this static output — map clean paths here.
 * /app itself is a real directory (filesystem). Nested /app/p/... must rewrite to
 * /app so the PWA loads while the browser URL stays shareable.
 */
export default function middleware(request) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'app') {
    // /app/p/{id} and /app/p/{id}/m/{msg} → SPA shell
    if (parts[1] === 'p') return rewrite(new URL('/app', request.url));
    return next();
  }

  if (parts[0] === 'chat') {
    // /chat and /chat/p/... share the same SPA as /app
    return rewrite(new URL('/app', request.url));
  }

  if (parts[0] === 'themes') {
    // /themes/new is the builder. Falling through to /share sends visitors home.
    if (!parts[1] || parts[1] === 'new') return next();
    return rewrite(new URL('/theme', request.url));
  }

  return rewrite(new URL('/share', request.url));
}

import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: ['/m', '/m/:id', '/themes/:id'],
};

/** vercel.json rewrites do not apply on this static output — map /m and /themes/:id here. */
export default function middleware(request) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'themes') {
    // /themes/new is the builder. Falling through to /share sends visitors home.
    if (!parts[1] || parts[1] === 'new') return next();
    return rewrite(new URL('/theme', request.url));
  }
  return rewrite(new URL('/share', request.url));
}

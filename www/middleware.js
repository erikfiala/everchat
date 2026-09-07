import { rewrite } from '@vercel/functions';

export const config = {
  matcher: ['/m', '/m/:id'],
};

/** Serve the share trampoline at /m and /m/:id. vercel.json rewrites do not apply on this static output. */
export default function middleware(request) {
  return rewrite(new URL('/share', request.url));
}

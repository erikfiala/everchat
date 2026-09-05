import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SignJWT, jwtVerify } from 'https://deno.land/x/jose@v5.9.6/index.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function rpConfig() {
  // WEBAUTHN_ORIGIN may be a single origin or comma-separated list
  // (e.g. chrome-extension://…,https://everch.at) for SimpleWebAuthn expectedOrigin.
  const raw =
    Deno.env.get('WEBAUTHN_ORIGIN') || 'http://localhost:3000';
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    rpID: Deno.env.get('WEBAUTHN_RP_ID') || 'localhost',
    rpName: Deno.env.get('WEBAUTHN_RP_NAME') || 'Everchat',
    origin: origins.length <= 1 ? origins[0]! : origins,
  };
}

/** HMAC key for custom session JWTs — JWT_SECRET may be raw text or base64url key material. */
function jwtSecretKey(): Uint8Array {
  const raw =
    Deno.env.get('JWT_SECRET') ||
    Deno.env.get('SUPABASE_JWT_SECRET') ||
    'dev-secret';
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (padded.length % 4)) % 4);
    const bin = Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0));
    if (bin.length >= 16) return bin;
  } catch {
    /* fall through to utf-8 */
  }
  return new TextEncoder().encode(raw);
}

export async function mintSession(user: {
  id: string;
  username: string;
  avatar_url: string | null;
  karma: number;
}) {
  const secret = jwtSecretKey();
  const kid = Deno.env.get('JWT_KID') || undefined;
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const header: { alg: 'HS256'; typ: 'JWT'; kid?: string } = {
    alg: 'HS256',
    typ: 'JWT',
  };
  if (kid) header.kid = kid;
  const token = await new SignJWT({
    role: 'authenticated',
    aud: 'authenticated',
    username: user.username,
  })
    .setProtectedHeader(header)
    .setIssuer('supabase')
    .setAudience('authenticated')
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(secret);

  return { token, expiresAt, user };
}

export async function verifySessionToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const secret = jwtSecretKey();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export const RESERVED = new Set([
  'everchat',
  'admin',
  'mod',
  'moderator',
  'support',
  'system',
  'null',
  'undefined',
  'me',
  'root',
  'official',
  'help',
  'api',
  'staff',
]);

export function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

export function isValidUsername(u: string) {
  return /^[a-z0-9_]{3,20}$/.test(u) && !RESERVED.has(u);
}

export function toBase64Url(data: ArrayBuffer | Uint8Array | string): string {
  if (typeof data === 'string') return data;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlToUint8(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

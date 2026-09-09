import { adminClient, corsHeaders, json, verifySessionToken } from '../_shared/auth.ts';
import { DEFAULT_TOKENS } from '../_shared/theme.ts';

const SLUG = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;
const DEFAULT_SLUG = 'everchat';
const DEFAULT_ID = 'e0e0e0e0-0000-4000-8000-000000000001';
const HOURLY_LIMIT = 60;

async function clientHash(req: Request): Promise<string> {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip =
    forwarded.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const ua = (req.headers.get('user-agent') || '').slice(0, 80);
  const bytes = new TextEncoder().encode(`${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

async function ensureDefaultTheme(
  sb: ReturnType<typeof adminClient>,
): Promise<void> {
  const { data } = await sb
    .from('themes')
    .select('id')
    .eq('slug', DEFAULT_SLUG)
    .maybeSingle();
  if (data?.id) return;
  await sb.from('themes').insert({
    id: DEFAULT_ID,
    slug: DEFAULT_SLUG,
    name: 'Default',
    author_name: 'Everchat',
    font_family: '',
    tokens: DEFAULT_TOKENS,
    created_at: '2020-01-01T00:00:00Z',
  });
}

async function underLimit(
  sb: ReturnType<typeof adminClient>,
  key: string,
): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  const { data, error } = await sb
    .from('theme_like_limits')
    .select('count')
    .eq('client_key', key)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();
  if (error) {
    console.error('theme like limit read', error);
    return false;
  }
  if ((data?.count ?? 0) >= HOURLY_LIMIT) return false;
  const { error: bumpErr } = await sb.from('theme_like_limits').upsert(
    {
      client_key: key,
      window_start: windowStart.toISOString(),
      count: (data?.count ?? 0) + 1,
    },
    { onConflict: 'client_key,window_start' },
  );
  if (bumpErr) {
    console.error('theme like limit write', bumpErr);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const sb = adminClient();
    const userId = await verifySessionToken(req.headers.get('authorization'));
    const hash = await clientHash(req);
    const identity = userId
      ? { user_id: userId, client_hash: null }
      : { user_id: null, client_hash: hash };
    const limitKey = userId ? `user:${userId}` : `anon:${hash}`;

    await ensureDefaultTheme(sb);

    if (req.method === 'GET') {
      let query = sb.from('theme_likes').select('themes!inner(slug)');
      query = userId
        ? query.eq('user_id', userId)
        : query.eq('client_hash', hash);
      const { data, error } = await query;
      if (error) {
        console.error('theme likes read', error);
        return json({ error: 'Could not load likes' }, 500);
      }
      const liked = (data || [])
        .map((row) => {
          const theme = row.themes as { slug?: string } | { slug?: string }[] | null;
          if (Array.isArray(theme)) return theme[0]?.slug;
          return theme?.slug;
        })
        .filter((slug): slug is string => typeof slug === 'string' && SLUG.test(slug));
      return json({ liked });
    }

    const raw = await req.json().catch(() => null);
    const slug = typeof raw?.slug === 'string' ? raw.slug : '';
    if (!SLUG.test(slug)) {
      return json({ error: 'Invalid theme', code: 'invalid' }, 400);
    }

    if (!(await underLimit(sb, limitKey))) {
      return json({ error: 'Rate limited', code: 'rate_limit' }, 429);
    }

    const { data: theme, error: themeErr } = await sb
      .from('themes')
      .select('id, like_count')
      .eq('slug', slug)
      .maybeSingle();
    if (themeErr || !theme) {
      return json({ error: 'Not found', code: 'missing' }, 404);
    }

    let existingQuery = sb
      .from('theme_likes')
      .select('theme_id')
      .eq('theme_id', theme.id);
    existingQuery = userId
      ? existingQuery.eq('user_id', userId)
      : existingQuery.eq('client_hash', hash);
    const { data: existing, error: existingErr } = await existingQuery.maybeSingle();
    if (existingErr) {
      console.error('theme like existing', existingErr);
      return json({ error: 'Could not like' }, 500);
    }

    if (existing) {
      let del = sb.from('theme_likes').delete().eq('theme_id', theme.id);
      del = userId ? del.eq('user_id', userId) : del.eq('client_hash', hash);
      const { error: delErr } = await del;
      if (delErr) {
        console.error('theme unlike', delErr);
        return json({ error: 'Could not like' }, 500);
      }
    } else {
      const { error: insErr } = await sb.from('theme_likes').insert({
        theme_id: theme.id,
        ...identity,
      });
      if (insErr) {
        console.error('theme like', insErr);
        return json({ error: 'Could not like' }, 500);
      }
    }

    const { data: next, error: nextErr } = await sb
      .from('themes')
      .select('like_count')
      .eq('id', theme.id)
      .single();
    if (nextErr) {
      console.error('theme like count', nextErr);
      return json({ error: 'Could not like' }, 500);
    }
    return json({
      liked: !existing,
      like_count: next?.like_count ?? 0,
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not like' }, 500);
  }
});

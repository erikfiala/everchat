import {
  adminClient,
  corsHeaders,
  json,
  verifySessionToken,
} from '../_shared/auth.ts';
import { slugify, validateTheme } from '../_shared/theme.ts';

const HOURLY_LIMIT = 5;

function clientHash(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  const ua = (req.headers.get('user-agent') || '').slice(0, 80);
  return `${ip}|${ua}`;
}

function suffix(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const userId = await verifySessionToken(req.headers.get('authorization'));
    if (!userId) {
      return json({ error: 'Unauthorized', code: 'auth' }, 401);
    }

    const raw = await req.json();
    const incoming =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...raw, author: 'pending' }
        : raw;
    const theme = validateTheme(incoming);
    if (!theme) {
      return json({ error: 'Invalid theme', code: 'invalid' }, 400);
    }

    const sb = adminClient();
    const { data: profile } = await sb
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    const handle =
      typeof profile?.username === 'string' ? profile.username.trim() : '';
    if (!handle) {
      return json({ error: 'Unauthorized', code: 'auth' }, 401);
    }

    const hash = clientHash(req);
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const { data: limitRow, error: limitErr } = await sb
      .from('theme_publish_limits')
      .select('count')
      .eq('client_hash', hash)
      .eq('window_start', windowStart.toISOString())
      .maybeSingle();
    if (limitErr) {
      console.error('theme limit read', limitErr);
      return json({ error: 'Could not publish' }, 500);
    }
    if ((limitRow?.count ?? 0) >= HOURLY_LIMIT) {
      return json({ error: 'Rate limited', code: 'rate_limit' }, 429);
    }

    const { error: bumpErr } = await sb.from('theme_publish_limits').upsert(
      {
        client_hash: hash,
        window_start: windowStart.toISOString(),
        count: (limitRow?.count ?? 0) + 1,
      },
      { onConflict: 'client_hash,window_start' },
    );
    if (bumpErr) {
      console.error('theme limit write', bumpErr);
      return json({ error: 'Could not publish' }, 500);
    }

    let slug = `${slugify(theme.name)}-${suffix()}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await sb
        .from('themes')
        .insert({
          slug,
          name: theme.name,
          author_name: handle,
          font_family: theme.fontFamily,
          icon_pack: theme.iconPack,
          tokens: theme.tokens,
        })
        .select('id, slug')
        .single();
      if (!error && data) {
        return json({ ok: true, id: data.id, slug: data.slug });
      }
      if (error?.code === '23505') {
        slug = `${slugify(theme.name)}-${suffix()}`;
        continue;
      }
      console.error('theme insert', error);
      return json({ error: 'Could not publish' }, 500);
    }
    return json({ error: 'Could not publish' }, 500);
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not publish' }, 500);
  }
});

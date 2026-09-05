import { corsHeaders, json } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GIPHY_API_KEY');
    if (!apiKey) {
      return json({ error: 'Giphy not configured', results: [] }, 503);
    }

    const body = await req.json();
    const q = String(body.q || '').trim();
    if (!q) return json({ results: [] });

    const url = new URL('https://api.giphy.com/v1/gifs/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '12');
    url.searchParams.set('rating', 'pg-13');
    url.searchParams.set('lang', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) {
      return json({ error: 'Giphy request failed', results: [] }, 502);
    }
    const data = await res.json();
    const results = (data.data || []).map(
      (g: {
        id: string;
        title: string;
        images: {
          original: { url: string };
          fixed_height_small: { url: string };
          downsized: { url: string };
        };
      }) => ({
        id: g.id,
        title: g.title,
        url: g.images.original?.url || g.images.downsized?.url,
        preview:
          g.images.fixed_height_small?.url || g.images.downsized?.url,
      }),
    );

    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message, results: [] }, 500);
  }
});

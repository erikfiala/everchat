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

    // Empty query → Giphy trending (search requires `q` and used to return []).
    const url = new URL(
      q
        ? 'https://api.giphy.com/v1/gifs/search'
        : 'https://api.giphy.com/v1/gifs/trending',
    );
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('limit', '12');
    url.searchParams.set('rating', 'pg-13');
    if (q) {
      url.searchParams.set('q', q);
      url.searchParams.set('lang', 'en');
    }

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
      }) => {
        // Persist/display i.giphy.com embeds — API original.url is a
        // cid-bound media*.giphy.com/v1.Y2lk… path that often 403s in <img>.
        const id = String(g.id || '').trim();
        const fallback =
          g.images.original?.url || g.images.downsized?.url || '';
        const previewFallback =
          g.images.fixed_height_small?.url ||
          g.images.downsized?.url ||
          fallback;
        return {
          id,
          title: g.title,
          url: id ? `https://i.giphy.com/${id}.gif` : fallback,
          preview: id
            ? `https://i.giphy.com/media/${id}/200w.gif`
            : previewFallback,
        };
      },
    );

    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message, results: [] }, 500);
  }
});

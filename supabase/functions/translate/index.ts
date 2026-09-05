import { corsHeaders, json } from '../_shared/auth.ts';

/**
 * Proxies Google Cloud Translation API v2.
 * Secrets: TRANSLATE_API_KEY (or GOOGLE_TRANSLATE_API_KEY)
 *
 * Body: { text: string, targetLang: string, sourceLang?: string }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey =
      Deno.env.get('TRANSLATE_API_KEY') ||
      Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    if (!apiKey) {
      return json(
        {
          unavailable: true,
          error: 'Translation unavailable',
        },
        503,
      );
    }

    const body = await req.json();
    const text = String(body.text || '').trim();
    const targetLang = String(body.targetLang || body.target || '')
      .trim()
      .replace('_', '-');
    const sourceLang = body.sourceLang
      ? String(body.sourceLang).trim()
      : undefined;

    if (!text) return json({ translatedText: '' });
    if (!targetLang) {
      return json({ error: 'targetLang required' }, 400);
    }
    if (text.length > 5000) {
      return json({ error: 'Text too long' }, 400);
    }

    // Google uses bare language codes; map our catalog codes.
    const target = normalizeGoogleLang(targetLang);

    const url = new URL(
      'https://translation.googleapis.com/language/translate/v2',
    );
    url.searchParams.set('key', apiKey);

    const payload: Record<string, unknown> = {
      q: text,
      target,
      format: 'text',
    };
    if (sourceLang) payload.source = normalizeGoogleLang(sourceLang);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('translate upstream', res.status, errText);
      return json(
        { unavailable: true, error: 'Translation unavailable' },
        502,
      );
    }

    const data = await res.json();
    const translatedText =
      data?.data?.translations?.[0]?.translatedText ?? null;
    if (typeof translatedText !== 'string') {
      return json(
        { unavailable: true, error: 'Translation unavailable' },
        502,
      );
    }

    return json({
      translatedText,
      detectedSourceLanguage:
        data?.data?.translations?.[0]?.detectedSourceLanguage,
    });
  } catch (e) {
    console.error(e);
    return json(
      {
        unavailable: true,
        error: (e as Error).message || 'Translation unavailable',
      },
      500,
    );
  }
});

function normalizeGoogleLang(tag: string): string {
  const t = tag.toLowerCase();
  if (t === 'zh-cn' || t === 'zh-hans') return 'zh-CN';
  if (t === 'zh-tw' || t === 'zh-hant') return 'zh-TW';
  if (t === 'pt-br') return 'pt';
  if (t.startsWith('nb') || t === 'no') return 'no';
  const primary = t.split('-')[0] || t;
  return primary;
}

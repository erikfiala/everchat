import { adminClient, corsHeaders, json } from '../_shared/auth.ts';

/**
 * Proxies Google Cloud Translation API v2.
 * Secrets: TRANSLATE_API_KEY (or GOOGLE_TRANSLATE_API_KEY)
 *
 * Body: { text: string, targetLang: string, sourceLang?: string, messageId?: string }
 *
 * Looks up public.message_translations (message_id + locale) before calling
 * Google. On miss, translates, upserts the row (service role), and returns.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text = String(body.text || '').trim();
    const targetLang = normalizeTranslationLocale(
      String(body.targetLang || body.target || ''),
    );
    const sourceLang = body.sourceLang
      ? String(body.sourceLang).trim()
      : undefined;
    const messageId = parseMessageId(body.messageId);

    if (!text) return json({ translatedText: '' });
    if (!targetLang) {
      return json({ error: 'targetLang required' }, 400);
    }
    if (text.length > 5000) {
      return json({ error: 'Text too long' }, 400);
    }

    if (messageId) {
      const cached = await readCachedTranslation(messageId, targetLang);
      if (cached != null) {
        return json({ translatedText: cached });
      }
    }

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

    if (messageId) {
      await writeCachedTranslation(messageId, targetLang, translatedText);
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeTranslationLocale(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

function parseMessageId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

async function readCachedTranslation(
  messageId: string,
  locale: string,
): Promise<string | null> {
  try {
    const { data, error } = await adminClient()
      .from('message_translations')
      .select('body')
      .eq('message_id', messageId)
      .eq('locale', locale)
      .maybeSingle();
    if (error) {
      console.error('translate cache read', error);
      return null;
    }
    return typeof data?.body === 'string' ? data.body : null;
  } catch (e) {
    console.error('translate cache read', e);
    return null;
  }
}

async function writeCachedTranslation(
  messageId: string,
  locale: string,
  translatedText: string,
) {
  try {
    const { error } = await adminClient()
      .from('message_translations')
      .upsert(
        { message_id: messageId, locale, body: translatedText },
        { onConflict: 'message_id,locale' },
      );
    if (error) console.error('translate cache write', error);
  } catch (e) {
    console.error('translate cache write', e);
  }
}

function normalizeGoogleLang(tag: string): string {
  const t = tag.toLowerCase();
  if (t === 'zh-cn' || t === 'zh-hans') return 'zh-CN';
  if (t === 'zh-tw' || t === 'zh-hant') return 'zh-TW';
  if (t === 'pt-br') return 'pt';
  if (t.startsWith('nb') || t === 'no') return 'no';
  const primary = t.split('-')[0] || t;
  return primary;
}

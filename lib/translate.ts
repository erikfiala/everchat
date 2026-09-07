import { callEdgeFunction, getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const memory = new Map<string, string>();
const LS_PREFIX = 'ec-tr:';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stable cache key for a target language (`zh-CN` / `zh_cn` → `zh-cn`). */
export function normalizeTranslationLocale(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

function cacheKey(text: string, targetLang: string, messageId?: string) {
  return `${messageId ?? ''}|${normalizeTranslationLocale(targetLang)}|${text}`;
}

function isMessageId(id: string | undefined): id is string {
  return Boolean(id && UUID_RE.test(id));
}

function readLs(key: string): string | null {
  try {
    return localStorage.getItem(LS_PREFIX + key);
  } catch {
    return null;
  }
}

function writeLs(key: string, value: string) {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* quota — ignore */
  }
}

async function readDurableCache(
  messageId: string,
  locale: string,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await getSupabase()
      .from('message_translations')
      .select('body')
      .eq('message_id', messageId)
      .eq('locale', locale)
      .maybeSingle();
    if (error || !data?.body) return null;
    return data.body;
  } catch {
    return null;
  }
}

function remember(key: string, text: string) {
  memory.set(key, text);
  writeLs(key, text);
}

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; unavailable: true; error?: string };

/**
 * Translate arbitrary message body into the UI language via Edge Function.
 * Does not touch UI chrome catalogs — posts only.
 *
 * Order: in-memory → localStorage → durable `message_translations` row →
 * translate edge (which also checks/writes that table before Google).
 */
export async function translateMessageBody(options: {
  text: string;
  targetLang: string;
  messageId?: string;
  token?: string | null;
}): Promise<TranslateResult> {
  const text = options.text.trim();
  if (!text) return { ok: true, text: '' };

  const locale = normalizeTranslationLocale(options.targetLang);
  const key = cacheKey(text, locale, options.messageId);
  const mem = memory.get(key);
  if (mem != null) return { ok: true, text: mem };
  const ls = readLs(key);
  if (ls != null) {
    memory.set(key, ls);
    return { ok: true, text: ls };
  }

  if (isMessageId(options.messageId)) {
    const durable = await readDurableCache(options.messageId, locale);
    if (durable != null) {
      remember(key, durable);
      return { ok: true, text: durable };
    }
  }

  if (!isSupabaseConfigured) {
    return { ok: false, unavailable: true };
  }

  try {
    const data = await callEdgeFunction<{
      translatedText?: string;
      error?: string;
      unavailable?: boolean;
    }>(
      'translate',
      {
        text,
        targetLang: locale,
        messageId: options.messageId,
      },
      options.token,
    );

    if (data.unavailable || !data.translatedText) {
      return {
        ok: false,
        unavailable: true,
        error: data.error,
      };
    }

    remember(key, data.translatedText);
    return { ok: true, text: data.translatedText };
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      /not configured|unavailable|503|TRANSLATE/i.test(msg) ||
      msg.includes('Translation')
    ) {
      return { ok: false, unavailable: true, error: msg };
    }
    return { ok: false, unavailable: true, error: msg };
  }
}

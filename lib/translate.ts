import { callEdgeFunction, isSupabaseConfigured } from '@/lib/supabase';

const memory = new Map<string, string>();
const LS_PREFIX = 'ec-tr:';

function cacheKey(text: string, targetLang: string, messageId?: string) {
  return `${messageId ?? ''}|${targetLang}|${text}`;
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

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; unavailable: true; error?: string };

/**
 * Translate arbitrary message body into the UI language via Edge Function.
 * Does not touch UI chrome catalogs — posts only.
 */
export async function translateMessageBody(options: {
  text: string;
  targetLang: string;
  messageId?: string;
  token?: string | null;
}): Promise<TranslateResult> {
  const text = options.text.trim();
  if (!text) return { ok: true, text: '' };

  const key = cacheKey(text, options.targetLang, options.messageId);
  const mem = memory.get(key);
  if (mem != null) return { ok: true, text: mem };
  const ls = readLs(key);
  if (ls != null) {
    memory.set(key, ls);
    return { ok: true, text: ls };
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
        targetLang: options.targetLang,
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

    memory.set(key, data.translatedText);
    writeLs(key, data.translatedText);
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

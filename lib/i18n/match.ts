import { primaryLanguageSubtag } from '../locale';
import { isSupportedLocale, type LocaleCode } from './languages';

/** Map a BCP-47 tag to the closest catalog we ship. */
export function matchSupportedLocale(
  tag: string | null | undefined,
): LocaleCode {
  if (!tag?.trim()) return 'en';
  const normalized = tag.trim().replace(/_/g, '-');
  const lower = normalized.toLowerCase();

  if (isSupportedLocale(normalized)) return normalized;
  if (isSupportedLocale(lower)) return lower;

  if (lower.startsWith('zh')) {
    if (
      lower.includes('hant') ||
      lower.includes('tw') ||
      lower.includes('hk') ||
      lower.includes('mo')
    ) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  if (lower.startsWith('pt-br') || lower === 'pt-br') return 'pt-BR';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('nb') || lower.startsWith('nn') || lower === 'no') {
    return 'nb';
  }

  const primary = primaryLanguageSubtag(normalized);
  if (primary === 'zh') return 'zh-CN';
  if (isSupportedLocale(primary)) return primary;

  return 'en';
}

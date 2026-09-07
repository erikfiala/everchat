import type { Locale } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { bg } from 'date-fns/locale/bg';
import { bn } from 'date-fns/locale/bn';
import { ca } from 'date-fns/locale/ca';
import { cs } from 'date-fns/locale/cs';
import { da } from 'date-fns/locale/da';
import { de } from 'date-fns/locale/de';
import { el } from 'date-fns/locale/el';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { et } from 'date-fns/locale/et';
import { faIR } from 'date-fns/locale/fa-IR';
import { fi } from 'date-fns/locale/fi';
import { fr } from 'date-fns/locale/fr';
import { gu } from 'date-fns/locale/gu';
import { he } from 'date-fns/locale/he';
import { hi } from 'date-fns/locale/hi';
import { hr } from 'date-fns/locale/hr';
import { hu } from 'date-fns/locale/hu';
import { id } from 'date-fns/locale/id';
import { it } from 'date-fns/locale/it';
import { ja } from 'date-fns/locale/ja';
import { kn } from 'date-fns/locale/kn';
import { ko } from 'date-fns/locale/ko';
import { lt } from 'date-fns/locale/lt';
import { lv } from 'date-fns/locale/lv';
import { ms } from 'date-fns/locale/ms';
import { nb } from 'date-fns/locale/nb';
import { nl } from 'date-fns/locale/nl';
import { pl } from 'date-fns/locale/pl';
import { pt } from 'date-fns/locale/pt';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ro } from 'date-fns/locale/ro';
import { ru } from 'date-fns/locale/ru';
import { sk } from 'date-fns/locale/sk';
import { sl } from 'date-fns/locale/sl';
import { sr } from 'date-fns/locale/sr';
import { sv } from 'date-fns/locale/sv';
import { ta } from 'date-fns/locale/ta';
import { te } from 'date-fns/locale/te';
import { th } from 'date-fns/locale/th';
import { tr } from 'date-fns/locale/tr';
import { uk } from 'date-fns/locale/uk';
import { vi } from 'date-fns/locale/vi';
import { zhCN } from 'date-fns/locale/zh-CN';
import { zhTW } from 'date-fns/locale/zh-TW';

/** date-fns locales we ship; ml / mr / sw / ur fall back to English. */
const DATE_FNS_LOCALES: Record<string, Locale> = {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  en: enUS,
  es,
  et,
  fa: faIR,
  fi,
  fr,
  gu,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  kn,
  ko,
  lt,
  lv,
  ms,
  nb,
  nl,
  pl,
  pt,
  'pt-BR': ptBR,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  ta,
  te,
  th,
  tr,
  uk,
  vi,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

export function dateFnsLocaleFor(code?: string): Locale {
  if (!code) return enUS;
  return DATE_FNS_LOCALES[code] ?? DATE_FNS_LOCALES[code.split('-')[0] ?? ''] ?? enUS;
}

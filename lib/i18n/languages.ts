import type en from './locales/en.json';

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;
export type LocaleCode = string;

/** Preference: follow browser UI language, or a fixed locale. */
export type LocalePreference = 'system' | LocaleCode;

export const STORAGE_KEY = 'ec-locale';

export type LanguageMeta = {
  code: LocaleCode;
  /** Native endonym shown in the switcher */
  nativeLabel: string;
  /** English label for search/accessibility */
  englishLabel: string;
};

/**
 * Major browser / Inter-friendly locales. Adding a language = JSON under
 * `lib/i18n/locales/{code}.json` + an entry here.
 */
export const LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', nativeLabel: 'English', englishLabel: 'English' },
  { code: 'ar', nativeLabel: 'العربية', englishLabel: 'Arabic' },
  { code: 'bg', nativeLabel: 'Български', englishLabel: 'Bulgarian' },
  { code: 'bn', nativeLabel: 'বাংলা', englishLabel: 'Bengali' },
  { code: 'ca', nativeLabel: 'Català', englishLabel: 'Catalan' },
  { code: 'cs', nativeLabel: 'Čeština', englishLabel: 'Czech' },
  { code: 'da', nativeLabel: 'Dansk', englishLabel: 'Danish' },
  { code: 'de', nativeLabel: 'Deutsch', englishLabel: 'German' },
  { code: 'el', nativeLabel: 'Ελληνικά', englishLabel: 'Greek' },
  { code: 'es', nativeLabel: 'Español', englishLabel: 'Spanish' },
  { code: 'et', nativeLabel: 'Eesti', englishLabel: 'Estonian' },
  { code: 'fa', nativeLabel: 'فارسی', englishLabel: 'Persian' },
  { code: 'fi', nativeLabel: 'Suomi', englishLabel: 'Finnish' },
  { code: 'fr', nativeLabel: 'Français', englishLabel: 'French' },
  { code: 'gu', nativeLabel: 'ગુજરાતી', englishLabel: 'Gujarati' },
  { code: 'he', nativeLabel: 'עברית', englishLabel: 'Hebrew' },
  { code: 'hi', nativeLabel: 'हिन्दी', englishLabel: 'Hindi' },
  { code: 'hr', nativeLabel: 'Hrvatski', englishLabel: 'Croatian' },
  { code: 'hu', nativeLabel: 'Magyar', englishLabel: 'Hungarian' },
  { code: 'id', nativeLabel: 'Bahasa Indonesia', englishLabel: 'Indonesian' },
  { code: 'it', nativeLabel: 'Italiano', englishLabel: 'Italian' },
  { code: 'ja', nativeLabel: '日本語', englishLabel: 'Japanese' },
  { code: 'kn', nativeLabel: 'ಕನ್ನಡ', englishLabel: 'Kannada' },
  { code: 'ko', nativeLabel: '한국어', englishLabel: 'Korean' },
  { code: 'lt', nativeLabel: 'Lietuvių', englishLabel: 'Lithuanian' },
  { code: 'lv', nativeLabel: 'Latviešu', englishLabel: 'Latvian' },
  { code: 'ml', nativeLabel: 'മലയാളം', englishLabel: 'Malayalam' },
  { code: 'mr', nativeLabel: 'मराठी', englishLabel: 'Marathi' },
  { code: 'ms', nativeLabel: 'Bahasa Melayu', englishLabel: 'Malay' },
  { code: 'nb', nativeLabel: 'Norsk bokmål', englishLabel: 'Norwegian Bokmål' },
  { code: 'nl', nativeLabel: 'Nederlands', englishLabel: 'Dutch' },
  { code: 'pl', nativeLabel: 'Polski', englishLabel: 'Polish' },
  { code: 'pt', nativeLabel: 'Português', englishLabel: 'Portuguese' },
  { code: 'pt-BR', nativeLabel: 'Português (Brasil)', englishLabel: 'Portuguese (Brazil)' },
  { code: 'ro', nativeLabel: 'Română', englishLabel: 'Romanian' },
  { code: 'ru', nativeLabel: 'Русский', englishLabel: 'Russian' },
  { code: 'sk', nativeLabel: 'Slovenčina', englishLabel: 'Slovak' },
  { code: 'sl', nativeLabel: 'Slovenščina', englishLabel: 'Slovenian' },
  { code: 'sr', nativeLabel: 'Српски', englishLabel: 'Serbian' },
  { code: 'sv', nativeLabel: 'Svenska', englishLabel: 'Swedish' },
  { code: 'sw', nativeLabel: 'Kiswahili', englishLabel: 'Swahili' },
  { code: 'ta', nativeLabel: 'தமிழ்', englishLabel: 'Tamil' },
  { code: 'te', nativeLabel: 'తెలుగు', englishLabel: 'Telugu' },
  { code: 'th', nativeLabel: 'ไทย', englishLabel: 'Thai' },
  { code: 'tr', nativeLabel: 'Türkçe', englishLabel: 'Turkish' },
  { code: 'uk', nativeLabel: 'Українська', englishLabel: 'Ukrainian' },
  { code: 'ur', nativeLabel: 'اردو', englishLabel: 'Urdu' },
  { code: 'vi', nativeLabel: 'Tiếng Việt', englishLabel: 'Vietnamese' },
  { code: 'zh-CN', nativeLabel: '简体中文', englishLabel: 'Chinese (Simplified)' },
  { code: 'zh-TW', nativeLabel: '繁體中文', englishLabel: 'Chinese (Traditional)' },
] as const;

export const SUPPORTED_LOCALES: readonly LocaleCode[] = LANGUAGES.map(
  (l) => l.code,
);

const SUPPORTED_SET = new Set(SUPPORTED_LOCALES);

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_SET.has(code);
}

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || (typeof value === 'string' && isSupportedLocale(value));
}

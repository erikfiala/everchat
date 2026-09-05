import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/hooks/useLocale';
import {
  THEME_OPTIONS,
  useTheme,
  type ThemePreference,
} from '@/hooks/useTheme';
import type { LocalePreference } from '@/lib/i18n';

export function SettingsTab() {
  const theme = useTheme();
  const { t, preference, setPreference, languages } = useLocale();

  const themeLabel = (pref: ThemePreference) =>
    pref === 'system'
      ? t('theme.system')
      : pref === 'light'
        ? t('theme.light')
        : t('theme.dark');

  const languageTriggerLabel =
    preference === 'system'
      ? t('settings.languageSystem')
      : languages.find((l) => l.code === preference)?.nativeLabel ?? preference;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="px-3 py-2 text-sm font-semibold">{t('settings.title')}</h1>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <label
            htmlFor="settings-mode"
            className="block text-sm font-medium text-[var(--color-foreground)]"
          >
            {t('settings.mode')}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="settings-mode"
                variant="outline"
                className="h-9 w-full justify-between gap-2 bg-[var(--color-card)] px-3 font-normal shadow-sm"
              >
                <span className="truncate">
                  {themeLabel(theme.preference)}
                </span>
                <ChevronDown
                  className="size-4 shrink-0 opacity-60"
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {THEME_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onSelect={() => theme.setPreference(opt)}
                  className="gap-2 pe-2"
                >
                  <span className="flex size-3.5 items-center justify-center">
                    {theme.preference === opt ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : null}
                  </span>
                  {themeLabel(opt)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="settings-language"
            className="block text-sm font-medium text-[var(--color-foreground)]"
          >
            {t('settings.language')}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="settings-language"
                variant="outline"
                className="h-9 w-full justify-between gap-2 bg-[var(--color-card)] px-3 font-normal shadow-sm"
              >
                <span className="truncate">{languageTriggerLabel}</span>
                <ChevronDown
                  className="size-4 shrink-0 opacity-60"
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
            >
              <DropdownMenuItem
                onSelect={() => setPreference('system')}
                className="gap-2 pe-2"
              >
                <span className="flex size-3.5 items-center justify-center">
                  {preference === 'system' ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : null}
                </span>
                {t('settings.languageSystem')}
              </DropdownMenuItem>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onSelect={() =>
                    setPreference(lang.code as LocalePreference)
                  }
                  className="gap-2 pe-2"
                >
                  <span className="flex size-3.5 items-center justify-center">
                    {preference === lang.code ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : null}
                  </span>
                  <span className="truncate">{lang.nativeLabel}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

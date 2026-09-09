import { Icon } from '@/components/ui/icon';
import { PageTitleBar } from '@/components/PageTitleBar';
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
import { useSkin } from '@/hooks/useSkin';
import type { LocalePreference } from '@/lib/i18n';
import { storedSkinKey, type StoredSkin } from '@/lib/theme';
import { FIELD_LABEL_CLASS } from '@/components/ui/typography';

const SELECT_TRIGGER_CLASS =
  'h-9 w-full justify-between gap-2 bg-[var(--color-card)] px-3 font-normal';

function themesForMenu(imported: StoredSkin[], skin: StoredSkin | null) {
  if (!skin) return imported;
  const key = storedSkinKey(skin);
  if (imported.some((item) => storedSkinKey(item) === key)) return imported;
  return [skin, ...imported];
}

export function SettingsTab() {
  const theme = useTheme();
  const { skin, imported, setSkin } = useSkin();
  const { t, preference, setPreference, languages } = useLocale();

  const modeLabel = (pref: ThemePreference) =>
    pref === 'system'
      ? t('theme.system')
      : pref === 'light'
        ? t('theme.light')
        : t('theme.dark');

  const languageTriggerLabel =
    preference === 'system'
      ? t('settings.languageSystem')
      : languages.find((l) => l.code === preference)?.nativeLabel ?? preference;

  const skinTriggerLabel = skin ? skin.name : t('settings.skinDefault');
  const importedThemes = themesForMenu(imported, skin);
  const canSelectTheme = importedThemes.length > 0;
  const selectedKey = skin ? storedSkinKey(skin) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTitleBar>{t('settings.title')}</PageTitleBar>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pt-4">
        <div>
          <label htmlFor="settings-mode" className={FIELD_LABEL_CLASS}>
            {t('settings.mode')}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="settings-mode"
                variant="outline"
                className={SELECT_TRIGGER_CLASS}
              >
                <span className="truncate">
                  {modeLabel(theme.preference)}
                </span>
                <Icon
                  name="chevronDown"
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
                      <Icon name="check" className="size-3.5" aria-hidden />
                    ) : null}
                  </span>
                  {modeLabel(opt)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <label htmlFor="settings-language" className={FIELD_LABEL_CLASS}>
            {t('settings.language')}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="settings-language"
                variant="outline"
                className={SELECT_TRIGGER_CLASS}
              >
                <span className="truncate">{languageTriggerLabel}</span>
                <Icon
                  name="chevronDown"
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
                    <Icon name="check" className="size-3.5" aria-hidden />
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
                      <Icon name="check" className="size-3.5" aria-hidden />
                    ) : null}
                  </span>
                  <span className="truncate">{lang.nativeLabel}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <label htmlFor="settings-theme" className={FIELD_LABEL_CLASS}>
            {t('settings.skin')}
          </label>
          {canSelectTheme ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="settings-theme"
                  variant="outline"
                  className={SELECT_TRIGGER_CLASS}
                >
                  <span className="truncate">{skinTriggerLabel}</span>
                  <Icon
                    name="chevronDown"
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
                  onSelect={() => setSkin(null)}
                  className="gap-2 pe-2"
                >
                  <span className="flex size-3.5 items-center justify-center">
                    {!skin ? <Icon name="check" className="size-3.5" aria-hidden /> : null}
                  </span>
                  <span className="truncate">{t('settings.skinDefault')}</span>
                </DropdownMenuItem>
                {importedThemes.map((item) => {
                  const key = storedSkinKey(item);
                  return (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => setSkin(item)}
                      className="gap-2 pe-2"
                    >
                      <span className="flex size-3.5 items-center justify-center">
                        {selectedKey === key ? (
                          <Icon name="check" className="size-3.5" aria-hidden />
                        ) : null}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              id="settings-theme"
              type="button"
              variant="outline"
              disabled
              className={SELECT_TRIGGER_CLASS}
            >
              <span className="truncate">{skinTriggerLabel}</span>
              <Icon
                name="chevronDown"
                className="size-4 shrink-0 opacity-60"
                aria-hidden
              />
            </Button>
          )}
          <Button
            variant="outline"
            className="mt-2 h-9 w-full justify-center bg-[var(--color-card)] px-3 font-normal"
            asChild
          >
            <a
              href="https://everch.at/themes"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('settings.skinBrowse')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

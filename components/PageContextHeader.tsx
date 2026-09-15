import { useEffect, useRef, useState } from 'react';
import { Favicon } from '@/components/Favicon';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/useLocale';
import { coercePasteUrl, displayUrl } from '@/lib/canonicalize';
import { googleS2FaviconForHost } from '@/lib/favicon';
import { cn } from '@/lib/utils';
import { isWebApp } from '@/lib/webapp/mode';

interface PageContextHeaderProps {
  title?: string | null;
  host?: string | null;
  faviconUrl?: string | null;
  isCurrentPage?: boolean;
  className?: string;
  /** Current navigable URL for the editable webapp address bar. */
  url?: string | null;
}

export function PageContextHeader({
  title,
  host,
  faviconUrl,
  isCurrentPage = false,
  className,
  url,
}: PageContextHeaderProps) {
  const { t } = useLocale();
  const web = isWebApp();
  const hostLabel = displayUrl(host);
  const resolvedFavicon =
    faviconUrl ||
    (hostLabel ? googleS2FaviconForHost(hostLabel.split('/')[0] ?? '') : null);

  const [draft, setDraft] = useState(() => displayUrl(url || host) || '');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(displayUrl(url || host) || '');
  }, [url, host]);

  const submitUrl = async () => {
    const next = coercePasteUrl(draft);
    if (!next) {
      setDraft(displayUrl(url || host) || '');
      return;
    }
    const current = url?.trim() || '';
    if (current && coercePasteUrl(current) === next) return;
    try {
      await browser.runtime.sendMessage({
        type: 'SET_ACTIVE_TAB_URL',
        url: next,
      });
    } catch {
      /* ignore */
    }
  };

  if (web) {
    return (
      <div
        className={cn(
          'flex min-h-14 w-full min-w-0 items-start gap-2 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
          className,
        )}
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        data-ec-pad-x
        data-ec-gap
      >
        <Favicon src={resolvedFavicon} className="mt-0.5" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-sm font-medium">
            {title || hostLabel || t('page.untitled')}
          </div>
          <Input
            ref={urlInputRef}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 h-8 px-2 text-xs"
            placeholder={t('page.pasteUrl')}
            value={draft}
            aria-label={t('page.urlLabel')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void submitUrl()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mt-0.5 size-8 shrink-0"
          aria-label={t('page.editUrl')}
          onClick={() => {
            urlInputRef.current?.focus();
            urlInputRef.current?.select();
          }}
        >
          <Icon name="penSquare" className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-14 w-full min-w-0 items-start gap-2 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
        className,
      )}
      data-ec-pad-x
      data-ec-gap
    >
      <Favicon src={faviconUrl} className="mt-0.5" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">
          {title || hostLabel || t('page.thisPage')}
        </div>
        {hostLabel && (
          <div className="inline-flex min-w-0 max-w-full items-baseline gap-1 text-xs text-[var(--color-muted-foreground)]">
            <span className="truncate">{hostLabel}</span>
            {isCurrentPage && (
              <>
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                <span className="shrink-0" data-current-page="">
                  {t('page.thisPage')}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

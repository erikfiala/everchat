import { useEffect, useRef, useState } from 'react';
import { Favicon } from '@/components/Favicon';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const displayValue = displayUrl(url || host) || '';
  const [draft, setDraft] = useState(displayValue);
  const [editing, setEditing] = useState(!displayValue);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(displayValue);
    if (!displayValue) setEditing(true);
  }, [displayValue]);

  useEffect(() => {
    if (!editing) return;
    const el = urlInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const exitEditIfPossible = () => {
    if (displayValue) setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(displayValue);
    exitEditIfPossible();
  };

  const submitUrl = async () => {
    const next = coercePasteUrl(draft);
    if (!next) {
      setDraft(displayValue);
      exitEditIfPossible();
      return;
    }
    const current = url?.trim() || '';
    if (current && coercePasteUrl(current) === next) {
      setEditing(false);
      return;
    }
    try {
      await browser.runtime.sendMessage({
        type: 'SET_ACTIVE_TAB_URL',
        url: next,
      });
      setEditing(false);
    } catch {
      /* ignore */
    }
  };

  const enterEdit = () => {
    setDraft(displayValue);
    setEditing(true);
  };

  if (web) {
    const canCancelEdit = Boolean(displayValue);

    return (
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            'flex min-h-14 w-full min-w-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
            className,
          )}
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
          data-ec-pad-x
          data-ec-gap
        >
          {editing ? (
            <>
              <Input
                ref={urlInputRef}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-9 min-w-0 flex-1 px-2 text-xs focus:outline-2 focus:outline-solid focus:outline-[var(--color-ring)] focus:outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--color-ring)] focus-visible:outline-offset-2"
                placeholder={t('page.pasteUrl')}
                value={draft}
                aria-label={t('page.urlLabel')}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitUrl();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 text-xs"
                aria-label={t('page.go')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void submitUrl()}
              >
                {t('page.go')}
              </Button>
              {canCancelEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 p-0"
                      aria-label={t('common.cancel')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={cancelEdit}
                    >
                      <Icon name="close" className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.cancel')}</TooltipContent>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              <Favicon src={resolvedFavicon} className="mt-0.5 shrink-0 self-start" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">
                  {title || hostLabel || displayValue || t('page.thisPage')}
                </div>
                {displayValue && (
                  <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {displayValue}
                  </div>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 p-0"
                    aria-label={t('page.editUrl')}
                    onClick={enterEdit}
                  >
                    <Icon name="penSquare" className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('page.editUrl')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
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

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
import { resolveFaviconUrl } from '@/lib/favicon';
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
  // Prefer real http(s) tab/DB favicon; Google s2 only when missing/non-http.
  const resolvedFavicon = resolveFaviconUrl({
    faviconUrl,
    url,
    canonicalUrl: hostLabel || host,
  });

  const displayValue = displayUrl(url || host) || '';
  const openHref =
    coercePasteUrl(url?.trim() || '') ||
    coercePasteUrl(host?.trim() || '') ||
    coercePasteUrl(displayValue) ||
    null;
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
                className="h-9 min-w-0 flex-1 focus:outline-2 focus:outline-solid focus:outline-[var(--color-ring)] focus:outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--color-ring)] focus-visible:outline-offset-2"
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
              <div className="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus-visible:text-[var(--color-foreground)]"
                      aria-label={t('page.openChat')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void submitUrl()}
                    >
                      <Icon name="arrowRight" className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('page.openChat')}</TooltipContent>
                </Tooltip>
                {canCancelEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus-visible:text-[var(--color-foreground)]"
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
              </div>
            </>
          ) : (
            <>
              <Favicon src={resolvedFavicon} className="shrink-0" />
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
              <div className="flex shrink-0 items-center gap-0.5">
                {openHref && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus-visible:text-[var(--color-foreground)]"
                        aria-label={t('page.openPage')}
                        onClick={() => {
                          window.open(openHref, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <Icon name="externalLink" className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('page.openPage')}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus-visible:text-[var(--color-foreground)]"
                      aria-label={t('page.editUrl')}
                      onClick={enterEdit}
                    >
                      <Icon name="penSquare" className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('page.editUrl')}</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-14 w-full min-w-0 items-center gap-2 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
        className,
      )}
      data-ec-pad-x
      data-ec-gap
    >
      <Favicon src={resolvedFavicon} className="shrink-0" />
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

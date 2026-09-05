import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageContextHeader } from '@/components/PageContextHeader';
import { MessageRow } from './MessageRow';
import { Composer } from './Composer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { usePageThread } from '@/hooks/usePageThread';
import {
  THEME_OPTIONS,
  useTheme,
  type ThemePreference,
} from '@/hooks/useTheme';
import type { MessageNode, SortMode, TabInfo } from '@/lib/database.types';
import { findPathToMessage, reportMessage } from '@/lib/messages';
import type { LocalePreference } from '@/lib/i18n';
import { toast } from 'sonner';

interface ChatTabProps {
  tab: TabInfo;
  onOpenProfile: (username: string) => void;
  clearFocus: () => void;
}

export function ChatTab({ tab, onOpenProfile, clearFocus }: ChatTabProps) {
  const { user, requireAuth, setShowAuthLanding } = useAuth();
  const theme = useTheme();
  const { t, tError, preference, setPreference, languages } =
    useLocale();
  const thread = usePageThread(tab, user?.id);
  const [replyTo, setReplyTo] = useState<MessageNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [continueThreadIds, setContinueThreadIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!tab.focusMessageId || thread.loading || !thread.roots.length) return;
    const path = findPathToMessage(thread.roots, tab.focusMessageId);
    if (path) {
      setContinueThreadIds((prev) => {
        const next = new Set(prev);
        path.forEach((id) => next.add(id));
        return next;
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        path.forEach((id) => next.add(id));
        return next;
      });
      requestAnimationFrame(() => {
        const el = document.getElementById(`ec-msg-${tab.focusMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 1600);
        }
        clearFocus();
      });
    }
  }, [tab.focusMessageId, thread.loading, thread.roots, clearFocus]);

  const onSubmit = async (body: string, gifUrl?: string | null) => {
    await thread.post(body, replyTo?.id ?? null, gifUrl);
    setReplyTo(null);
  };

  const themeLabel = (pref: ThemePreference) =>
    pref === 'system'
      ? t('theme.system')
      : pref === 'light'
        ? t('theme.light')
        : t('theme.dark');

  const sortLabel = (mode: SortMode) =>
    mode === 'best' ? t('chat.sortBest') : t('chat.sortNew');

  const languageTriggerLabel =
    preference === 'system'
      ? t('chat.languageSystem')
      : languages.find((l) => l.code === preference)?.nativeLabel ?? preference;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageContextHeader
        title={tab.title}
        host={tab.host}
        faviconUrl={tab.favIconUrl}
      />
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {t('chat.sort')}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 shrink-0 gap-1 py-0 ps-2.5 pe-2 font-normal"
              >
                {sortLabel(thread.sort)}
                <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => thread.setSort('best')}>
                {t('chat.sortBest')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => thread.setSort('new')}>
                {t('chat.sortNew')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t('chat.mode')}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 py-0 ps-2.5 pe-2 font-normal"
                >
                  {themeLabel(theme.preference)}
                  <ChevronDown
                    className="size-3.5 shrink-0 opacity-60"
                    aria-hidden
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {t('chat.language')}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 max-w-36 shrink-0 gap-1 truncate py-0 ps-2.5 pe-2 font-normal"
                >
                  <span className="truncate">{languageTriggerLabel}</span>
                  <ChevronDown
                    className="size-3.5 shrink-0 opacity-60"
                    aria-hidden
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-72 overflow-y-auto"
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
                  {t('chat.languageSystem')}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {thread.loading && (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {thread.error && (
          <div className="py-6 text-center text-sm text-[var(--color-destructive)]">
            {tError(thread.error)}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => thread.reload()}
              >
                {t('chat.retry')}
              </Button>
            </div>
          </div>
        )}
        {!thread.loading && !thread.error && thread.roots.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {t('chat.beFirst')}
          </p>
        )}
        {!thread.loading &&
          thread.roots.map((node) => (
            <MessageRow
              key={node.id}
              node={node}
              depth={0}
              pageUrl={tab.url}
              currentUserId={user?.id}
              expandedIds={expandedIds}
              continueThreadIds={continueThreadIds}
              onToggleExpand={(id) =>
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onContinueThread={(id) =>
                setContinueThreadIds((prev) => new Set(prev).add(id))
              }
              onReply={setReplyTo}
              onVote={thread.vote}
              onDelete={async (id) => {
                try {
                  await thread.remove(id);
                } catch (e) {
                  toast.error(tError(e));
                }
              }}
              onReport={async (id) => {
                if (!user) return;
                try {
                  await reportMessage(id, user.id);
                  toast.success(t('toast.reported'));
                } catch (e) {
                  toast.error(tError(e));
                }
              }}
              onOpenProfile={onOpenProfile}
              requireAuth={requireAuth}
            />
          ))}
      </div>

      <Composer
        replyToHandle={replyTo?.author?.username}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={onSubmit}
        gated={!user}
        onGate={() => setShowAuthLanding(true)}
      />
    </div>
  );
}

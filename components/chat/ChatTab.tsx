import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { usePageThread } from '@/hooks/usePageThread';
import { useRoomHistory } from '@/hooks/useRoomHistory';
import { useTypingIndicators } from '@/hooks/useTypingIndicators';
import { cn } from '@/lib/utils';
import type { MessageNode, SortMode, TabInfo } from '@/lib/database.types';
import { findPathToMessage, reportMessage } from '@/lib/messages';
import { toast } from 'sonner';

interface ChatTabProps {
  tab: TabInfo;
  onOpenProfile: (username: string) => void;
  clearFocus: () => void;
}

export function ChatTab({ tab, onOpenProfile, clearFocus }: ChatTabProps) {
  const { user, requireAuth, setShowAuthLanding } = useAuth();
  const { t, tError } = useLocale();
  const { viewing, canGoBack, canGoForward, goBack, goForward } =
    useRoomHistory(tab);
  const thread = usePageThread(viewing, user?.id);
  const { typers, setLocalTyping } = useTypingIndicators(
    thread.pageId,
    user ? { id: user.id, username: user.username } : null,
  );
  const [replyTo, setReplyTo] = useState<MessageNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [continueThreadIds, setContinueThreadIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setReplyTo(null);
    setExpandedIds(new Set());
    setContinueThreadIds(new Set());
  }, [viewing.canonicalUrl]);

  useEffect(() => {
    if (!viewing.focusMessageId || thread.loading || !thread.roots.length)
      return;
    const path = findPathToMessage(thread.roots, viewing.focusMessageId);
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
        const el = document.getElementById(`ec-msg-${viewing.focusMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 1600);
        }
        clearFocus();
      });
    }
  }, [viewing.focusMessageId, thread.loading, thread.roots, clearFocus]);

  const onSubmit = async (body: string, gifUrl?: string | null) => {
    await thread.post(body, replyTo?.id ?? null, gifUrl);
    setReplyTo(null);
  };

  const sortLabel = (mode: SortMode) =>
    mode === 'best' ? t('chat.sortBest') : t('chat.sortNew');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageContextHeader
        title={viewing.title}
        host={viewing.host}
        faviconUrl={viewing.favIconUrl}
      />
      <div className="flex min-h-14 items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
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

        <TooltipProvider delayDuration={200}>
          <div className="ms-auto flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={goBack}
                  disabled={!canGoBack}
                  className={cn(
                    'box-border flex size-9 shrink-0 items-center justify-center rounded-md p-0 leading-none transition-colors',
                    canGoBack
                      ? 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]'
                      : 'cursor-not-allowed text-[var(--color-muted-foreground)] opacity-40',
                  )}
                  aria-label={t('chat.goBack')}
                >
                  <ArrowLeft className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.goBack')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={goForward}
                  disabled={!canGoForward}
                  className={cn(
                    'box-border flex size-9 shrink-0 items-center justify-center rounded-md p-0 leading-none transition-colors',
                    canGoForward
                      ? 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]'
                      : 'cursor-not-allowed text-[var(--color-muted-foreground)] opacity-40',
                  )}
                  aria-label={t('chat.goForward')}
                >
                  <ArrowRight className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.goForward')}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
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
              pageUrl={viewing.url}
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

      <div
        className="min-h-5 shrink-0 px-3 py-1"
        aria-live="polite"
        aria-atomic="true"
      >
        {typers.length === 1 && typers[0] && (
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {t('chat.typingOne', { username: typers[0].username })}
          </p>
        )}
        {typers.length > 1 && (
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {t('chat.typingMany', { n: typers.length })}
          </p>
        )}
      </div>

      <Composer
        replyToHandle={replyTo?.author?.username}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={onSubmit}
        gated={!user}
        onGate={() => setShowAuthLanding(true)}
        onTypingChange={user ? setLocalTyping : undefined}
      />
    </div>
  );
}

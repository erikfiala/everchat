import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContextHeader } from '@/components/PageContextHeader';
import { ListSentinel } from '@/components/ListSentinel';
import { MessageRow, type MessageRowHandlers } from './MessageRow';
import { ThreadPane } from './ThreadPane';
import { Composer } from './Composer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useListSentinel } from '@/hooks/useListSentinel';
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
import {
  conversationStackForFocus,
  findMessageNode,
  findPathToMessage,
  reportMessage,
} from '@/lib/messages';
import { collectMentionParticipants } from '@/lib/mentions';
import { toast } from 'sonner';

interface ChatTabProps {
  tab: TabInfo;
  onOpenProfile: (username: string) => void;
  clearFocus: () => void;
}

export function ChatTab({ tab, onOpenProfile, clearFocus }: ChatTabProps) {
  const { user, requireAuth, setShowAuthLanding } = useAuth();
  const { t, tError } = useLocale();
  const { viewing, isCurrentPage, canGoBack, canGoForward, goBack, goForward } =
    useRoomHistory(tab);
  const thread = usePageThread(viewing, user?.id);
  const { typers, setLocalTyping } = useTypingIndicators(
    thread.pageId,
    user ? { id: user.id, username: user.username } : null,
  );
  const [replyTo, setReplyTo] = useState<MessageNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [threadStack, setThreadStack] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useListSentinel(
    thread.hasMore && !thread.loading && !thread.error,
    thread.loadMore,
    scrollRef,
    thread.roots.length,
  );

  useEffect(() => {
    setReplyTo(null);
    setExpandedIds(new Set());
    setThreadStack([]);
    setExiting(false);
  }, [viewing.canonicalUrl]);

  useEffect(() => {
    setThreadStack((prev) => {
      const next = prev.filter((id) => findMessageNode(thread.roots, id));
      return next.length === prev.length ? prev : next;
    });
  }, [thread.roots]);

  useEffect(() => {
    if (!viewing.focusMessageId || thread.loading) return;
    const path = findPathToMessage(thread.roots, viewing.focusMessageId);
    if (!path) {
      void thread.ensureMessage(viewing.focusMessageId);
      return;
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      path.forEach((id) => next.add(id));
      return next;
    });
    setExiting(false);
    const stack = conversationStackForFocus(path);
    setThreadStack(stack);
    const focusId = viewing.focusMessageId;
    const scrollToFocus = () => {
      const el = document.getElementById(`ec-msg-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-pulse');
        setTimeout(() => el.classList.remove('highlight-pulse'), 1600);
      }
      clearFocus();
    };
    requestAnimationFrame(() => {
      if (stack.length > 0) requestAnimationFrame(scrollToFocus);
      else scrollToFocus();
    });
  }, [viewing.focusMessageId, thread.loading, thread.roots, clearFocus]);

  const inThread = threadStack.length > 0;

  const pushConversation = useCallback((node: MessageNode) => {
    if (node.children.length === 0) return;
    setExiting(false);
    setThreadStack((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
  }, []);

  const popConversation = useCallback(() => {
    if (exiting || threadStack.length === 0) return;
    setExiting(true);
  }, [exiting, threadStack.length]);

  const backToMainThread = useCallback(() => {
    if (exiting || threadStack.length === 0) return;
    setThreadStack((prev) =>
      prev.length <= 1 ? prev : [prev[prev.length - 1]!],
    );
    setExiting(true);
  }, [exiting, threadStack.length]);

  const onPaneExited = useCallback(() => {
    const topId = threadStack[threadStack.length - 1];
    setThreadStack((prev) => prev.slice(0, -1));
    setExiting(false);
    requestAnimationFrame(() => {
      if (!topId) return;
      document.getElementById(`ec-show-replies-${topId}`)?.focus();
    });
  }, [threadStack]);

  useEffect(() => {
    if (!inThread) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      event.preventDefault();
      popConversation();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inThread, popConversation]);

  const onSubmit = async (body: string, gifUrl?: string | null) => {
    await thread.post(body, replyTo?.id ?? null, gifUrl);
    setReplyTo(null);
  };

  const mentionParticipants = useMemo(
    () => collectMentionParticipants(thread.roots),
    [thread.roots],
  );

  const sortLabel = (mode: SortMode) =>
    mode === 'best' ? t('chat.sortBest') : t('chat.sortNew');

  const rowHandlers: MessageRowHandlers = useMemo(
    () => ({
      pageUrl: viewing.url,
      currentUserId: user?.id,
      expandedIds,
      onToggleExpand: (id) =>
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      onReply: setReplyTo,
      onVote: thread.vote,
      onDelete: async (id) => {
        try {
          await thread.remove(id);
        } catch (e) {
          toast.error(tError(e));
        }
      },
      onReport: async (id) => {
        if (!user) return;
        try {
          await reportMessage(id, user.id);
          toast.success(t('toast.reported'));
        } catch (e) {
          toast.error(tError(e));
        }
      },
      onOpenProfile,
      requireAuth,
    }),
    [
      viewing.url,
      user,
      expandedIds,
      thread.vote,
      thread.remove,
      tError,
      t,
      onOpenProfile,
      requireAuth,
    ],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageContextHeader
        title={viewing.title}
        host={viewing.host}
        faviconUrl={viewing.favIconUrl}
        isCurrentPage={isCurrentPage}
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

        {!inThread && (
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
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-3 pt-3"
          inert={inThread || undefined}
        >
          {thread.loading && thread.roots.length === 0 && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {thread.error && thread.roots.length === 0 && (
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
          {thread.roots.map((node) => (
            <MessageRow
              key={node.id}
              node={node}
              {...rowHandlers}
              onShowReplies={pushConversation}
            />
          ))}
          {thread.hasMore ? (
            <ListSentinel
              sentinelRef={sentinelRef}
              loading={thread.loadingMore}
            />
          ) : null}
        </div>

        {threadStack.map((id, index) => {
          const node = findMessageNode(thread.roots, id);
          if (!node) return null;
          const isTop = index === threadStack.length - 1;
          return (
            <ThreadPane
              key={id}
              node={node}
              depth={index}
              open={!exiting || !isTop}
              onBack={popConversation}
              onBackToMain={backToMainThread}
              onExited={onPaneExited}
              onShowReplies={pushConversation}
              {...rowHandlers}
            />
          );
        })}
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
        mentionParticipants={mentionParticipants}
      />
    </div>
  );
}

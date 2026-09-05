import { useEffect, useState } from 'react';
import { PageContextHeader } from '@/components/PageContextHeader';
import { MessageRow } from './MessageRow';
import { Composer } from './Composer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePageThread } from '@/hooks/usePageThread';
import type { MessageNode, TabInfo } from '@/lib/database.types';
import { findPathToMessage, reportMessage } from '@/lib/messages';
import { toast } from 'sonner';

interface ChatTabProps {
  tab: TabInfo;
  onOpenProfile: (username: string) => void;
  clearFocus: () => void;
}

export function ChatTab({ tab, onOpenProfile, clearFocus }: ChatTabProps) {
  const { user, requireAuth, setShowAuthLanding } = useAuth();
  const thread = usePageThread(tab, user?.id);
  const [replyTo, setReplyTo] = useState<MessageNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [continueThreadIds, setContinueThreadIds] = useState<Set<string>>(
    new Set(),
  );

  // Deep-link focus
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageContextHeader
        title={tab.title}
        host={tab.host}
        faviconUrl={tab.favIconUrl}
      />
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-1.5">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Sort
        </span>
        <Button
          size="sm"
          variant={thread.sort === 'best' ? 'secondary' : 'ghost'}
          className="h-7"
          onClick={() => thread.setSort('best')}
        >
          Best
        </Button>
        <Button
          size="sm"
          variant={thread.sort === 'new' ? 'secondary' : 'ghost'}
          className="h-7"
          onClick={() => thread.setSort('new')}
        >
          New
        </Button>
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
            {thread.error}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => thread.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        {!thread.loading && !thread.error && thread.roots.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            Be the first to comment on this page.
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
                  toast.error((e as Error).message);
                }
              }}
              onReport={async (id) => {
                if (!user) return;
                try {
                  await reportMessage(id, user.id);
                  toast.success('Reported');
                } catch (e) {
                  toast.error((e as Error).message);
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

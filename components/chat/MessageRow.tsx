import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  HatGlasses,
  Link,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import type { MessageNode } from '@/lib/database.types';
import { isCommunityCollapsed, formatScore, scoreColorClass, safeRelativeTime } from '@/lib/collapse';
import { ANONYMOUS_HANDLE } from '@/lib/constants';
import { bindRelativeTime } from '@/lib/time';
import { buildShareLink } from '@/lib/canonicalize';
import { translateMessageBody } from '@/lib/translate';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';

export interface MessageRowHandlers {
  pageUrl: string | null;
  currentUserId?: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onReply: (node: MessageNode) => void;
  onVote: (id: string, value: 1 | -1) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onOpenProfile: (username: string) => void;
  requireAuth: () => boolean;
}

interface MessageRowProps extends MessageRowHandlers {
  node: MessageNode;
  /** 0 = conversation/feed root. Nested replies use a smaller avatar + thread line. */
  depth?: number;
  /** Render children as a Reddit-style tree (conversation pane only). */
  nestChildren?: boolean;
  onShowReplies?: (node: MessageNode) => void;
}

function ShowRepliesControl({
  node,
  onShowReplies,
}: {
  node: MessageNode;
  onShowReplies?: (node: MessageNode) => void;
}) {
  const { t } = useLocale();
  const count = node.children.length;
  if (!onShowReplies || count <= 0) return null;
  return (
    <Button
      type="button"
      id={`ec-show-replies-${node.id}`}
      variant="ghost"
      size="sm"
      className="mt-0.5 h-7 px-2 text-xs"
      onClick={() => onShowReplies(node)}
    >
      {count === 1
        ? t('message.showReply')
        : t('message.showReplies', { n: count })}
    </Button>
  );
}

export function MessageRow({
  node,
  depth = 0,
  nestChildren = false,
  pageUrl,
  currentUserId,
  expandedIds,
  onToggleExpand,
  onShowReplies,
  onReply,
  onVote,
  onDelete,
  onReport,
  onOpenProfile,
  requireAuth,
}: MessageRowProps) {
  const { t, locale } = useLocale();
  const formatTime = bindRelativeTime(locale, t('time.lessThanMinute'));
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => setMenuOpen(false);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const deleted = Boolean(node.deleted_at);
  const collapsed =
    !deleted && isCommunityCollapsed(node.upvotes, node.downvotes);
  const userExpanded = expandedIds.has(node.id);
  const showBody = !collapsed || userExpanded;
  const nested = depth > 0;
  const avatarClass = nested ? 'h-5 w-5' : 'h-7 w-7';
  const avatarIconClass = nested ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  const rowClass = cn(
    'group scroll-mt-16',
    nested &&
      'ec-thread-reply ms-2 border-s border-[var(--color-border)] ps-2',
  );
  const feedReplies = nestChildren ? undefined : onShowReplies;
  const nestedRows =
    nestChildren && (deleted || showBody)
      ? node.children.map((child) => (
          <MessageRow
            key={child.id}
            node={child}
            depth={depth + 1}
            nestChildren
            pageUrl={pageUrl}
            currentUserId={currentUserId}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onReply={onReply}
            onVote={onVote}
            onDelete={onDelete}
            onReport={onReport}
            onOpenProfile={onOpenProfile}
            requireAuth={requireAuth}
          />
        ))
      : null;

  const shareLink = async () => {
    const link = buildShareLink(node.id);
    await navigator.clipboard.writeText(link);
    toast.success(t('toast.linkCopied'));
    setMenuOpen(false);
  };

  const toggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translated) {
      setShowTranslation(true);
      setTranslateError(false);
      return;
    }
    if (!node.body?.trim()) return;
    setTranslating(true);
    setTranslateError(false);
    try {
      const result = await translateMessageBody({
        text: node.body,
        targetLang: locale,
        messageId: node.id,
        token: user?.token,
      });
      if (!result.ok) {
        setTranslateError(true);
        setShowTranslation(true);
        return;
      }
      setTranslated(result.text);
      setShowTranslation(true);
    } finally {
      setTranslating(false);
    }
  };

  if (deleted) {
    if (node.children.length === 0) return null;
    const timestamp = safeRelativeTime(node.created_at, formatTime);
    const timestampTitle = safeRelativeTime(node.created_at, (d) =>
      d.toLocaleString(locale),
    );
    return (
      <div id={`ec-msg-${node.id}`} className={rowClass}>
        <div className="flex items-start gap-2 py-2">
          <button
            type="button"
            onClick={() => onOpenProfile(ANONYMOUS_HANDLE)}
            className="shrink-0"
            aria-label={`@${ANONYMOUS_HANDLE}`}
          >
            <Avatar className={avatarClass}>
              <AvatarFallback>
                <HatGlasses className={avatarIconClass} aria-hidden />
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <button
                type="button"
                className="font-medium hover:underline"
                onClick={() => onOpenProfile(ANONYMOUS_HANDLE)}
              >
                @{ANONYMOUS_HANDLE}
              </button>
              {timestamp ? (
                <span
                  className="text-[var(--color-muted-foreground)]"
                  title={timestampTitle || undefined}
                >
                  {timestamp}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm italic text-[var(--color-muted-foreground)]">
              {t('message.deleted')}
            </p>
            {feedReplies && (
              <div className="mt-1.5">
                <ShowRepliesControl node={node} onShowReplies={feedReplies} />
              </div>
            )}
          </div>
        </div>
        {nestedRows}
      </div>
    );
  }

  return (
    <div id={`ec-msg-${node.id}`} className={rowClass}>
      <div className="flex items-start gap-2 py-2">
        <button
          type="button"
          onClick={() =>
            node.author?.username && onOpenProfile(node.author.username)
          }
          className="shrink-0"
        >
          <Avatar className={avatarClass}>
            {node.author?.avatar_url && (
              <AvatarImage src={node.author.avatar_url} />
            )}
            <AvatarFallback>
              {(node.author?.username || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <button
              type="button"
              className="font-medium hover:underline"
              onClick={() =>
                node.author?.username && onOpenProfile(node.author.username)
              }
            >
              @{node.author?.username || t('message.unknownAuthor')}
            </button>
            <span
              className="text-[var(--color-muted-foreground)]"
              title={
                safeRelativeTime(node.created_at, (d) =>
                  d.toLocaleString(locale),
                ) || undefined
              }
            >
              {safeRelativeTime(node.created_at, formatTime)}
            </span>
          </div>

          {collapsed && !userExpanded && (
            <button
              type="button"
              className="mt-1 text-sm text-[var(--color-muted-foreground)] hover:underline"
              onClick={() => onToggleExpand(node.id)}
            >
              {t('message.communityCollapsed', {
                score: formatScore(node.score),
              })}
            </button>
          )}

          {showBody && (
            <>
              {node.body && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {showTranslation && translateError
                    ? null
                    : showTranslation && translated
                      ? translated
                      : node.body}
                </p>
              )}
              {node.body && showTranslation && translateError && (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t('message.translationUnavailable')}
                </p>
              )}
              {node.gif_url && (
                <img
                  src={node.gif_url}
                  alt={t('message.gifAlt')}
                  className="mt-2 max-h-48 rounded-md"
                />
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
                <div className="me-2 flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-6 px-0',
                      node.myVote === 1 && 'text-[var(--color-score-pos)]',
                    )}
                    onClick={() => {
                      if (!requireAuth()) return;
                      onVote(node.id, 1);
                    }}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span
                    className={cn(
                      'min-w-[1.25rem] px-0.5 text-center text-xs font-medium tabular-nums',
                      scoreColorClass(node.score),
                    )}
                  >
                    {formatScore(node.score)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-6 px-0',
                      node.myVote === -1 && 'text-[var(--color-score-neg)]',
                    )}
                    onClick={() => {
                      if (!requireAuth()) return;
                      onVote(node.id, -1);
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    if (!requireAuth()) return;
                    onReply(node);
                  }}
                >
                  {t('message.reply')}
                </Button>
                {collapsed && userExpanded && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onToggleExpand(node.id)}
                  >
                    {t('message.hide')}
                  </Button>
                )}
                {node.body?.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 px-2 text-xs text-[var(--color-muted-foreground)]',
                      !showTranslation &&
                        !translating &&
                        'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                    )}
                    disabled={translating}
                    onClick={() => void toggleTranslation()}
                  >
                    {translating
                      ? t('message.translating')
                      : showTranslation
                        ? t('message.showOriginal')
                        : t('message.seeTranslation')}
                  </Button>
                )}
                <div className="relative ms-auto" ref={menuRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {menuOpen && (
                    <div className="absolute end-0 z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-md">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm hover:bg-[var(--color-accent)]"
                        onClick={shareLink}
                      >
                        <Link className="h-3.5 w-3.5" />
                        {t('message.shareLink')}
                      </button>
                      {currentUserId === node.author_id ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-[var(--color-destructive)] hover:bg-[var(--color-accent)]"
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('message.delete')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-[var(--color-destructive)] hover:bg-[var(--color-accent)]"
                          onClick={() => {
                            if (!requireAuth()) return;
                            onReport(node.id);
                            setMenuOpen(false);
                          }}
                        >
                          <CircleAlert className="h-3.5 w-3.5" />
                          {t('message.report')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <ShowRepliesControl node={node} onShowReplies={feedReplies} />
            </>
          )}
        </div>
      </div>
      {nestedRows}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('message.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('message.deleteConfirmBody')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmDeleteOpen(false);
                onDelete(node.id);
              }}
            >
              {t('message.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

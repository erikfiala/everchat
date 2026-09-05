import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Link2,
  MoreHorizontal,
  Reply,
  Trash2,
} from 'lucide-react';
import type { MessageNode } from '@/lib/database.types';
import { isCommunityCollapsed, formatScore, scoreColorClass } from '@/lib/collapse';
import { DEPTH_COLLAPSE_LEVEL } from '@/lib/constants';
import { buildDeepLink } from '@/lib/canonicalize';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MessageRowProps {
  node: MessageNode;
  depth: number;
  pageUrl: string | null;
  currentUserId?: string | null;
  expandedIds: Set<string>;
  continueThreadIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onContinueThread: (id: string) => void;
  onReply: (node: MessageNode) => void;
  onVote: (id: string, value: 1 | -1) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onOpenProfile: (username: string) => void;
  requireAuth: () => boolean;
}

export function MessageRow({
  node,
  depth,
  pageUrl,
  currentUserId,
  expandedIds,
  continueThreadIds,
  onToggleExpand,
  onContinueThread,
  onReply,
  onVote,
  onDelete,
  onReport,
  onOpenProfile,
  requireAuth,
}: MessageRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleted = Boolean(node.deleted_at);
  const collapsed =
    !deleted && isCommunityCollapsed(node.upvotes, node.downvotes);
  const userExpanded = expandedIds.has(node.id);
  const showBody = deleted || !collapsed || userExpanded;
  const hideDeep =
    depth >= DEPTH_COLLAPSE_LEVEL && !continueThreadIds.has(node.id);

  const copyLink = async () => {
    if (!pageUrl) return;
    const link = buildDeepLink(pageUrl, node.id);
    await navigator.clipboard.writeText(link);
    toast.success('Link copied');
    setMenuOpen(false);
  };

  if (hideDeep) {
    return (
      <div className="ml-4 border-l border-[var(--color-border)] pl-3 py-1">
        <button
          type="button"
          className="text-xs font-medium text-blue-600 hover:underline"
          onClick={() => onContinueThread(node.id)}
        >
          Continue thread
        </button>
      </div>
    );
  }

  return (
    <div
      id={`ec-msg-${node.id}`}
      className={cn('group scroll-mt-16', depth > 0 && 'ml-3 border-l border-[var(--color-border)] pl-3')}
    >
      <div className="flex gap-2 py-2">
        <button
          type="button"
          onClick={() =>
            node.author?.username && onOpenProfile(node.author.username)
          }
          className="shrink-0"
        >
          <Avatar className="h-7 w-7">
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
              @{node.author?.username || 'unknown'}
            </button>
            <span className="text-[var(--color-muted-foreground)]">
              {formatDistanceToNow(new Date(node.created_at), {
                addSuffix: true,
              })}
            </span>
            <span className={cn('font-medium', scoreColorClass(node.score))}>
              {formatScore(node.score)}
            </span>
          </div>

          {collapsed && !userExpanded && !deleted && (
            <button
              type="button"
              className="mt-1 text-xs text-[var(--color-muted-foreground)] hover:underline"
              onClick={() => onToggleExpand(node.id)}
            >
              Community collapsed · score {formatScore(node.score)} · show
            </button>
          )}

          {showBody && (
            <>
              {deleted ? (
                <p className="mt-1 text-sm italic text-[var(--color-muted-foreground)]">
                  [deleted]
                </p>
              ) : (
                <>
                  {node.body && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {node.body}
                    </p>
                  )}
                  {node.gif_url && (
                    <img
                      src={node.gif_url}
                      alt="GIF"
                      className="mt-2 max-h-48 rounded-md"
                    />
                  )}
                </>
              )}

              {!deleted && (
                <div className="mt-1.5 flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-7',
                      node.myVote === 1 && 'text-[var(--color-score-pos)]',
                    )}
                    onClick={() => {
                      if (!requireAuth()) return;
                      onVote(node.id, 1);
                    }}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-7',
                      node.myVote === -1 && 'text-[var(--color-score-neg)]',
                    )}
                    onClick={() => {
                      if (!requireAuth()) return;
                      onVote(node.id, -1);
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      if (!requireAuth()) return;
                      onReply(node);
                    }}
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </Button>
                  {collapsed && userExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onToggleExpand(node.id)}
                    >
                      Hide
                    </Button>
                  )}
                  <div className="relative ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => setMenuOpen((v) => !v)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-white py-1 shadow-md">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--color-accent)]"
                          onClick={copyLink}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Copy link
                        </button>
                        {currentUserId === node.author_id ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--color-destructive)] hover:bg-[var(--color-accent)]"
                            onClick={() => {
                              onDelete(node.id);
                              setMenuOpen(false);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--color-accent)]"
                            onClick={() => {
                              if (!requireAuth()) return;
                              onReport(node.id);
                              setMenuOpen(false);
                            }}
                          >
                            <Flag className="h-3.5 w-3.5" />
                            Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showBody &&
        node.children.map((child) => (
          <MessageRow
            key={child.id}
            node={child}
            depth={depth + 1}
            pageUrl={pageUrl}
            currentUserId={currentUserId}
            expandedIds={expandedIds}
            continueThreadIds={continueThreadIds}
            onToggleExpand={onToggleExpand}
            onContinueThread={onContinueThread}
            onReply={onReply}
            onVote={onVote}
            onDelete={onDelete}
            onReport={onReport}
            onOpenProfile={onOpenProfile}
            requireAuth={requireAuth}
          />
        ))}
    </div>
  );
}

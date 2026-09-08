import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { MessageNode } from '@/lib/database.types';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { MessageRow, type MessageRowHandlers } from './MessageRow';

const EXIT_MS = 340;

interface ThreadPaneProps extends MessageRowHandlers {
  node: MessageNode;
  depth: number;
  open: boolean;
  onBack: () => void;
  onBackToMain: () => void;
  onExited: () => void;
  onShowReplies: (node: MessageNode) => void;
}

export function ThreadPane({
  node,
  depth,
  open,
  onBack,
  onBackToMain,
  onExited,
  onShowReplies,
  ...rowHandlers
}: ThreadPaneProps) {
  const { t } = useLocale();
  const backRef = useRef<HTMLButtonElement>(null);
  const exitedRef = useRef(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    exitedRef.current = false;
    if (open) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (!open || !shown) return;
    backRef.current?.focus();
  }, [open, shown]);

  useEffect(() => {
    if (open) return;
    const finish = () => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      onExited();
    };
    const timer = window.setTimeout(finish, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, onExited]);

  const backToMain = depth === 0;
  const backLabel = backToMain
    ? t('message.backToMainThread')
    : t('common.back');

  return (
    <div
      role="region"
      aria-label={t('message.conversation')}
      className="ec-thread-pane absolute inset-0 z-10 flex min-h-0 flex-col bg-[var(--color-background)]"
      data-open={shown && open ? 'true' : 'false'}
      style={{ zIndex: 10 + depth }}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== 'transform') return;
        if (!open && !exitedRef.current) {
          exitedRef.current = true;
          onExited();
        }
      }}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--color-border)] px-2 py-1.5">
        <Button
          ref={backRef}
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={backToMain ? onBackToMain : onBack}
          aria-label={backLabel}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {backLabel}
        </Button>
        {!backToMain && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onBackToMain}
          >
            {t('message.backToMainThread')}
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div className="border-b border-[var(--color-border)] pb-1">
          <MessageRow node={node} {...rowHandlers} />
        </div>
        {node.children.map((child) => (
          <MessageRow
            key={child.id}
            node={child}
            {...rowHandlers}
            onShowReplies={onShowReplies}
          />
        ))}
      </div>
    </div>
  );
}

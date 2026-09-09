import type { MessageNode } from '@/lib/database.types';
import { useLocale } from '@/hooks/useLocale';
import { MessageRow, type MessageRowHandlers } from './MessageRow';

interface ThreadPaneProps extends MessageRowHandlers {
  node: MessageNode;
}

export function ThreadPane({ node, ...rowHandlers }: ThreadPaneProps) {
  const { t } = useLocale();

  return (
    <div
      role="region"
      aria-label={t('message.conversation')}
      className="ec-thread-pane absolute inset-0 z-10 flex min-h-0 flex-col bg-[var(--color-background)]"
    >
      <div
        data-ec-pad-x
        data-ec-pad-t
        className="min-h-0 flex-1 overflow-y-auto px-3 pt-3"
      >
        <MessageRow node={node} depth={0} nestChildren {...rowHandlers} />
      </div>
    </div>
  );
}

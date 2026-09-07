import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { formatScore, scoreColorClass } from '@/lib/collapse';
import {
  fetchLeaderboard,
  type LeaderboardPayload,
  type LeaderboardRow,
} from '@/lib/leaderboard';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface LeaderboardTabProps {
  onOpenProfile: (username: string) => void;
}

function handleInitials(username: string): string {
  return (username || '?').slice(0, 2).toUpperCase();
}

function rankColumnCh(ranks: number[]): number {
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 1);
  return String(maxRank).length;
}

function LeaderboardRowButton({
  row,
  onOpenProfile,
  pinned,
  rankCh,
}: {
  row: LeaderboardRow;
  onOpenProfile: (username: string) => void;
  pinned?: boolean;
  rankCh: number;
}) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(row.username)}
      className={cn(
        'flex w-full items-center gap-2 ps-2 pe-3 py-2 text-start hover:bg-[var(--color-accent)]',
        pinned && 'bg-[var(--color-muted)]/50',
        row.is_me && !pinned && 'bg-[var(--color-muted)]/40',
      )}
    >
      <span
        className="shrink-0 text-end text-sm font-normal tabular-nums text-[var(--color-muted-foreground)]"
        style={{ width: `${rankCh}ch` }}
      >
        {row.rank}
      </span>
      <Avatar className="h-5 w-5">
        {row.avatar_url && <AvatarImage src={row.avatar_url} />}
        <AvatarFallback>{handleInitials(row.username)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        @{row.username || t('message.unknownAuthor')}
      </span>
      <span
        className={cn(
          'shrink-0 text-sm font-normal tabular-nums',
          scoreColorClass(row.karma),
        )}
      >
        {formatScore(row.karma)}
      </span>
    </button>
  );
}

export function LeaderboardTab({ onOpenProfile }: LeaderboardTabProps) {
  const { t, tError } = useLocale();
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setData({ me: null, top: [] });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchLeaderboard(user?.id)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const reload = () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    fetchLeaderboard(user?.id)
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e);
      })
      .finally(() => setLoading(false));
  };

  const me = data?.me ?? null;
  const top = data?.top ?? [];
  const empty = !loading && !error && !me && top.length === 0;
  const rankCh = rankColumnCh([
    ...(me ? [me.rank] : []),
    ...top.map((row) => row.rank),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {me && !loading && !error && (
        <>
          <LeaderboardRowButton
            row={me}
            onOpenProfile={onOpenProfile}
            pinned
            rankCh={rankCh}
          />
          <div
            className="border-b border-[var(--color-border)]"
            role="separator"
          />
        </>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mx-3 mb-1 h-11 w-[calc(100%-1.5rem)]" />
          ))}
        {error ? (
          <div className="py-6 text-center text-sm text-[var(--color-destructive)]">
            {tError(error, 'leaderboard.error')}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={reload}
              >
                {t('chat.retry')}
              </Button>
            </div>
          </div>
        ) : null}
        {empty && (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {t('leaderboard.empty')}
          </p>
        )}
        {!loading &&
          !error &&
          top.map((row) => (
            <LeaderboardRowButton
              key={`${row.rank}-${row.username}`}
              row={row}
              onOpenProfile={onOpenProfile}
              rankCh={rankCh}
            />
          ))}
      </div>
    </div>
  );
}

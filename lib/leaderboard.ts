import { LEADERBOARD_LIMIT, LIST_PAGE_SIZE } from './constants';
import { pageHasMore } from './listPage';
import { getSupabase } from './supabase';

export type LeaderboardRow = {
  rank: number;
  username: string;
  avatar_url: string | null;
  karma: number;
  is_me: boolean;
};

export type LeaderboardPayload = {
  me: LeaderboardRow | null;
  top: LeaderboardRow[];
};

export type LeaderboardPageOpts = {
  limit?: number;
  offset?: number;
};

export function compareLeaderboardOrder(
  a: Pick<LeaderboardRow, 'karma' | 'username'>,
  b: Pick<LeaderboardRow, 'karma' | 'username'>,
): number {
  if (b.karma !== a.karma) return b.karma - a.karma;
  return a.username.localeCompare(b.username);
}

export function assignLeaderboardRanks<
  T extends Pick<LeaderboardRow, 'karma' | 'username' | 'avatar_url'>,
>(rows: T[], meUsername?: string | null, startRank = 1): LeaderboardRow[] {
  return [...rows]
    .sort(compareLeaderboardOrder)
    .map((row, i) => ({
      rank: startRank + i,
      username: row.username,
      avatar_url: row.avatar_url,
      karma: row.karma,
      is_me: Boolean(meUsername) && row.username === meUsername,
    }));
}

export function splitLeaderboardRows(rows: LeaderboardRow[]): LeaderboardPayload {
  const top = rows
    .filter((row) => row.rank <= LEADERBOARD_LIMIT)
    .sort((a, b) => a.rank - b.rank || compareLeaderboardOrder(a, b));
  const me = rows.find((row) => row.is_me) ?? null;
  return { me, top };
}

function isUnusableRpc(error: { code?: string; message?: string } | null) {
  const message = (error?.message ?? '').toLowerCase();
  return (
    error?.code === '42883' ||
    error?.code === 'PGRST202' ||
    (message.includes('leaderboard') &&
      (message.includes('does not exist') || message.includes('could not find')))
  );
}

async function fetchPinnedMe(
  userId?: string | null,
): Promise<{ me: LeaderboardRow | null; meUsername: string | null }> {
  if (!userId) return { me: null, meUsername: null };
  const sb = getSupabase();
  const { data: mine, error: meError } = await sb
    .from('profiles')
    .select('username, avatar_url, karma')
    .eq('id', userId)
    .maybeSingle();
  if (meError) throw meError;
  if (!mine) return { me: null, meUsername: null };

  const { count, error: rankError } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .or(
      `karma.gt.${mine.karma},and(karma.eq.${mine.karma},username.lt.${mine.username})`,
    );
  if (rankError) throw rankError;
  return {
    meUsername: mine.username,
    me: {
      rank: (count ?? 0) + 1,
      username: mine.username,
      avatar_url: mine.avatar_url,
      karma: mine.karma,
      is_me: true,
    },
  };
}

async function fetchLeaderboardFromProfiles(
  userId?: string | null,
  opts?: LeaderboardPageOpts,
): Promise<LeaderboardPayload> {
  const limit = opts?.limit ?? LIST_PAGE_SIZE;
  const offset = opts?.offset ?? 0;
  const capped = Math.min(limit, Math.max(0, LEADERBOARD_LIMIT - offset));
  const { me, meUsername } = await fetchPinnedMe(userId);
  if (capped <= 0) return { me, top: [] };

  const sb = getSupabase();
  const { data: topRows, error: topError } = await sb
    .from('profiles')
    .select('username, avatar_url, karma')
    .order('karma', { ascending: false })
    .order('username', { ascending: true })
    .range(offset, offset + capped - 1);
  if (topError) throw topError;

  return {
    me,
    top: assignLeaderboardRanks(topRows ?? [], meUsername, offset + 1),
  };
}

export async function fetchLeaderboard(
  userId?: string | null,
  opts?: LeaderboardPageOpts,
): Promise<LeaderboardPayload> {
  const limit = opts?.limit ?? LIST_PAGE_SIZE;
  const offset = opts?.offset ?? 0;
  const sb = getSupabase();
  const { data, error } = await sb.rpc('leaderboard', {
    p_limit: limit,
    p_offset: offset,
  });
  if (!error) {
    return splitLeaderboardRows(data ?? []);
  }
  if (isUnusableRpc(error)) {
    return fetchLeaderboardFromProfiles(userId, { limit, offset });
  }
  throw error;
}

export function leaderboardHasMore(topCount: number, lastPageLength: number) {
  return topCount < LEADERBOARD_LIMIT && pageHasMore(lastPageLength);
}

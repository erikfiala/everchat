import { LEADERBOARD_LIMIT } from './constants';
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

export function compareLeaderboardOrder(
  a: Pick<LeaderboardRow, 'karma' | 'username'>,
  b: Pick<LeaderboardRow, 'karma' | 'username'>,
): number {
  if (b.karma !== a.karma) return b.karma - a.karma;
  return a.username.localeCompare(b.username);
}

export function assignLeaderboardRanks<
  T extends Pick<LeaderboardRow, 'karma' | 'username' | 'avatar_url'>,
>(rows: T[], meUsername?: string | null): LeaderboardRow[] {
  return [...rows]
    .sort(compareLeaderboardOrder)
    .map((row, i) => ({
      rank: i + 1,
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

function isMissingRpc(error: { code?: string; message?: string } | null) {
  const message = (error?.message ?? '').toLowerCase();
  return (
    error?.code === '42883' ||
    (message.includes('leaderboard') && message.includes('does not exist'))
  );
}

async function fetchLeaderboardFromProfiles(
  userId?: string | null,
): Promise<LeaderboardPayload> {
  const sb = getSupabase();
  const { data: topRows, error: topError } = await sb
    .from('profiles')
    .select('username, avatar_url, karma')
    .order('karma', { ascending: false })
    .order('username', { ascending: true })
    .limit(LEADERBOARD_LIMIT);
  if (topError) throw topError;

  let meUsername: string | null = null;
  let me: LeaderboardRow | null = null;

  if (userId) {
    const { data: mine, error: meError } = await sb
      .from('profiles')
      .select('username, avatar_url, karma')
      .eq('id', userId)
      .maybeSingle();
    if (meError) throw meError;
    if (mine) {
      meUsername = mine.username;
      const { count, error: rankError } = await sb
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or(
          `karma.gt.${mine.karma},and(karma.eq.${mine.karma},username.lt.${mine.username})`,
        );
      if (rankError) throw rankError;
      me = {
        rank: (count ?? 0) + 1,
        username: mine.username,
        avatar_url: mine.avatar_url,
        karma: mine.karma,
        is_me: true,
      };
    }
  }

  return {
    me,
    top: assignLeaderboardRanks(topRows ?? [], meUsername),
  };
}

export async function fetchLeaderboard(
  userId?: string | null,
): Promise<LeaderboardPayload> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('leaderboard');
  if (!error) {
    return splitLeaderboardRows(data ?? []);
  }
  if (isMissingRpc(error)) {
    return fetchLeaderboardFromProfiles(userId);
  }
  throw error;
}

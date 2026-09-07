import { describe, expect, it } from 'vitest';
import {
  assignLeaderboardRanks,
  compareLeaderboardOrder,
  splitLeaderboardRows,
  type LeaderboardRow,
} from './leaderboard';

function row(
  overrides: Partial<LeaderboardRow> & Pick<LeaderboardRow, 'username'>,
): LeaderboardRow {
  return {
    rank: 0,
    avatar_url: null,
    karma: 0,
    is_me: false,
    ...overrides,
  };
}

describe('compareLeaderboardOrder', () => {
  it('sorts higher karma first, then username', () => {
    const rows = [
      { username: 'zoe', karma: 10 },
      { username: 'amy', karma: 10 },
      { username: 'bob', karma: 50 },
    ];
    expect([...rows].sort(compareLeaderboardOrder).map((r) => r.username)).toEqual(
      ['bob', 'amy', 'zoe'],
    );
  });
});

describe('assignLeaderboardRanks', () => {
  it('assigns 1-based ranks and marks the current handle', () => {
    const ranked = assignLeaderboardRanks(
      [
        { username: 'zoe', avatar_url: null, karma: 3 },
        { username: 'amy', avatar_url: 'a', karma: 9 },
      ],
      'zoe',
    );
    expect(ranked).toEqual([
      {
        rank: 1,
        username: 'amy',
        avatar_url: 'a',
        karma: 9,
        is_me: false,
      },
      {
        rank: 2,
        username: 'zoe',
        avatar_url: null,
        karma: 3,
        is_me: true,
      },
    ]);
  });
});

describe('splitLeaderboardRows', () => {
  it('pins is_me even when rank is outside the top 100', () => {
    const top = Array.from({ length: 2 }, (_, i) =>
      row({ rank: i + 1, username: `u${i}`, karma: 100 - i }),
    );
    const me = row({
      rank: 240,
      username: 'late',
      karma: 1,
      is_me: true,
    });
    const { me: pinned, top: list } = splitLeaderboardRows([...top, me]);
    expect(pinned).toEqual(me);
    expect(list.map((r) => r.username)).toEqual(['u0', 'u1']);
  });

  it('keeps the current user in the top list when they rank there', () => {
    const rows = [
      row({ rank: 1, username: 'amy', karma: 9, is_me: true }),
      row({ rank: 2, username: 'zoe', karma: 3 }),
    ];
    const { me, top } = splitLeaderboardRows(rows);
    expect(me?.username).toBe('amy');
    expect(top[0]?.username).toBe('amy');
    expect(top).toHaveLength(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  claimRealtimeChannel,
  subscribePostgresChanges,
} from './realtime';

const filter = {
  event: 'INSERT' as const,
  schema: 'public',
  table: 'notifications',
  filter: 'recipient_id=eq.u1',
};

function mockPostgresClient() {
  const topics: string[] = [];
  const order: string[] = [];
  const channel = {
    on: vi.fn(() => {
      order.push('on');
      return channel;
    }),
    subscribe: vi.fn(() => {
      order.push('subscribe');
      return channel;
    }),
  };
  const sb = {
    channel: vi.fn((name: string) => {
      topics.push(name);
      order.push('channel');
      return channel;
    }),
    removeChannel: vi.fn(async () => 'ok'),
    getChannels: vi.fn(() => []),
  };
  return { sb, channel, topics, order };
}

describe('subscribePostgresChanges', () => {
  it('registers postgres_changes before subscribe', () => {
    const { sb, order } = mockPostgresClient();
    subscribePostgresChanges(
      sb as never,
      'notifs:u1',
      filter,
      () => undefined,
    );
    expect(order).toEqual(['channel', 'on', 'subscribe']);
  });

  it('uses a unique topic so a second subscribe never reuses a joined channel', () => {
    const { sb, topics } = mockPostgresClient();
    subscribePostgresChanges(
      sb as never,
      'notifs:u1',
      filter,
      () => undefined,
    );
    subscribePostgresChanges(
      sb as never,
      'notifs:u1',
      filter,
      () => undefined,
    );
    expect(topics).toHaveLength(2);
    expect(topics[0]).toMatch(/^notifs:u1:/);
    expect(topics[1]).toMatch(/^notifs:u1:/);
    expect(topics[0]).not.toBe(topics[1]);
  });
});

describe('claimRealtimeChannel', () => {
  it('removes an existing same-topic channel before creating a new one', async () => {
    const leftover = { topic: 'realtime:page:p1:typing' };
    const created = { topic: 'realtime:page:p1:typing' };
    const removeChannel = vi.fn(async () => 'ok');
    const sb = {
      getChannels: vi.fn(() => [leftover]),
      removeChannel,
      channel: vi.fn(() => created),
    };

    const next = await claimRealtimeChannel(
      sb as never,
      'page:p1:typing',
      { config: { presence: { key: 'u1' } } },
    );

    expect(removeChannel).toHaveBeenCalledWith(leftover);
    expect(sb.channel).toHaveBeenCalledWith('page:p1:typing', {
      config: { presence: { key: 'u1' } },
    });
    expect(next).toBe(created);
  });
});

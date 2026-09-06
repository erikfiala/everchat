import { describe, expect, it } from 'vitest';
import { allowCredentialsForLogin } from './allowCredentials';

describe('allowCredentialsForLogin', () => {
  it('prefers server allowCredentials so login skips the usernameless picker', () => {
    expect(
      allowCredentialsForLogin([{ id: 'server' }], ['stored']),
    ).toEqual([{ id: 'server', type: 'public-key' }]);
  });

  it('falls back to locally stored ids', () => {
    expect(allowCredentialsForLogin(undefined, ['a', 'b'])).toEqual([
      { id: 'a', type: 'public-key' },
      { id: 'b', type: 'public-key' },
    ]);
  });

  it('returns empty when neither source has ids (caller must not call get())', () => {
    expect(allowCredentialsForLogin([], [])).toEqual([]);
    expect(allowCredentialsForLogin(undefined, [])).toEqual([]);
  });
});

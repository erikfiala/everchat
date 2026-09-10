import { describe, expect, it } from 'vitest';
import { allowCredentialsForLogin } from './allowCredentials';
import {
  LOGIN_INTERACTIVE_TIMEOUT_MS,
  LOGIN_PROBE_TIMEOUT_MS,
  REGISTER_TIMEOUT_MS,
} from './webauthn';

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

describe('passkey ceremony timeouts', () => {
  it('gives signup create() longer than interactive login get()', () => {
    expect(REGISTER_TIMEOUT_MS).toBe(120_000);
    expect(REGISTER_TIMEOUT_MS).toBeGreaterThan(LOGIN_INTERACTIVE_TIMEOUT_MS);
    expect(LOGIN_INTERACTIVE_TIMEOUT_MS).toBeGreaterThan(LOGIN_PROBE_TIMEOUT_MS);
  });
});

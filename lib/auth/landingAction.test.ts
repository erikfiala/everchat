import { describe, expect, it } from 'vitest';
import {
  resolveExistingAccountAction,
  resolveSignupAction,
} from './landingAction';

describe('resolveSignupAction', () => {
  it('always claims a new handle, even when this device already has passkeys', () => {
    expect(resolveSignupAction()).toBe('claim');
    expect(
      resolveSignupAction({ hasPasskeyHint: true, storedCredentialCount: 2 }),
    ).toBe('claim');
    expect(
      resolveSignupAction({ hasPasskeyHint: false, storedCredentialCount: 0 }),
    ).toBe('claim');
  });
});

describe('resolveExistingAccountAction', () => {
  it('starts login when stored credential ids can skip the usernameless picker', () => {
    expect(resolveExistingAccountAction(1)).toBe('login');
    expect(resolveExistingAccountAction(3)).toBe('login');
  });

  it('asks for @handle when this install has no stored credential ids', () => {
    expect(resolveExistingAccountAction(0)).toBe('returning');
  });
});

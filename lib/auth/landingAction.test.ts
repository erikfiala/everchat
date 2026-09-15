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
  it('always asks for @handle, even when this install has stored credential ids', () => {
    expect(resolveExistingAccountAction(0)).toBe('returning');
    expect(resolveExistingAccountAction(1)).toBe('returning');
    expect(resolveExistingAccountAction(3)).toBe('returning');
    expect(resolveExistingAccountAction()).toBe('returning');
  });
});

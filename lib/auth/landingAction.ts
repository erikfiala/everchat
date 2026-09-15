/** Landing-step routing for signup vs returning-user login. */

/**
 * "Sign up anonymously" always claims a new handle + create().
 * Stored passkey hints / credential ids must not hijack this into get().
 */
export function resolveSignupAction(_ctx?: {
  hasPasskeyHint?: boolean;
  storedCredentialCount?: number;
}): 'claim' {
  return 'claim';
}

/**
 * "I already have an account": stored ids skip the handle step (side-panel
 * usernameless get() hangs); otherwise ask for @handle first.
 */
export function resolveExistingAccountAction(
  storedCredentialCount: number,
): 'login' | 'returning' {
  return storedCredentialCount > 0 ? 'login' : 'returning';
}

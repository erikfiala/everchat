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
 * "I already have an account": always ask for @handle first so multi-account
 * users can target a specific account. Username-scoped login options return
 * server allowCredentials (avoids side-panel usernameless hang). Locally
 * stored credential ids must not skip this — they only cover passkeys from
 * prior ceremonies on this install (often just the latest account).
 */
export function resolveExistingAccountAction(
  _storedCredentialCount?: number,
): 'returning' {
  return 'returning';
}

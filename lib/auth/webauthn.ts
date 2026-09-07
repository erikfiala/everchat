import {
  startRegistration,
  startAuthentication,
  WebAuthnAbortService,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { callEdgeFunction } from '../supabase';
import type { SessionUser } from '../database.types';
import { saveSession, clearSession } from './session';
import {
  getStoredCredentialIds,
  rememberCredentialId,
} from './passkeyHint';
import { allowCredentialsForLogin } from './allowCredentials';
import { guessDeviceLabel } from '../deviceLabel';
import { DEVICE_LABEL_MAX_LEN } from '../profile';

/** Brand RP ID — never use chrome-extension:// host (invalid WebAuthn domain). */
const RP_ID =
  (import.meta.env.VITE_WEBAUTHN_RP_ID as string | undefined)?.trim() ||
  'everch.at';

/**
 * Chrome extension side panels often leave navigator.credentials.get pending
 * forever when no discoverable passkey exists for the RP (OS sheet never
 * appears). Silent/auto probes use a short window; explicit "I already have
 * an account" needs long enough for Touch ID / OS UI.
 */
export const LOGIN_PROBE_TIMEOUT_MS = 7_000;
export const LOGIN_INTERACTIVE_TIMEOUT_MS = 55_000;
const CEREMONY_TIMEOUT_MS = 20_000;

export type LoginPasskeyIntent = 'probe' | 'interactive';

const RP_ORIGIN = `https://${RP_ID}/*`;

/** Ensure Chrome granted host access so the extension may claim RP ID everch.at. */
async function ensureRpHostPermission(): Promise<void> {
  try {
    const perms = browser.permissions;
    if (!perms?.contains || !perms.request) return;
    const ok = await perms.contains({ origins: [RP_ORIGIN] });
    if (ok) return;
    const granted = await perms.request({ origins: [RP_ORIGIN] });
    if (!granted) {
      throw new Error('auth.toastPasskeyFailed');
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'auth.toastPasskeyFailed') throw e;
    /* permissions API unavailable — rely on manifest host_permissions */
  }
}

async function runCeremonyWithTimeout<T>(
  run: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      try {
        WebAuthnAbortService.cancelCeremony();
      } catch {
        /* ignore */
      }
      const err = new Error('auth.toastPasskeyTimedOut');
      err.name = 'TimeoutError';
      reject(err);
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(), timeoutPromise]);
  } catch (e) {
    if (timedOut) {
      const err = new Error('auth.toastPasskeyTimedOut');
      err.name = 'TimeoutError';
      throw err;
    }
    throw e;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export interface RegisterOptionsResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
  sessionToken: string;
}

export interface AuthSuccessResponse {
  token: string;
  expiresAt: number;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    karma: number;
  };
}

/** Force RP ID to the configured domain (extension origin is not a valid RP ID). */
function withRegistrationRpId(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptionsJSON {
  return {
    ...options,
    rp: {
      ...options.rp,
      id: RP_ID,
      name: options.rp?.name || 'Everchat',
    },
    // Defense in depth: never escalate UV beyond preferred in the side panel.
    authenticatorSelection: {
      ...options.authenticatorSelection,
      residentKey: options.authenticatorSelection?.residentKey ?? 'preferred',
      userVerification: 'preferred',
    },
  };
}

function withAuthenticationRpId(
  options: PublicKeyCredentialRequestOptionsJSON,
  timeoutMs: number,
): PublicKeyCredentialRequestOptionsJSON {
  return {
    ...options,
    rpId: RP_ID,
    userVerification: 'preferred',
    timeout: timeoutMs,
  };
}

export { allowCredentialsForLogin } from './allowCredentials';

/** Map raw WebAuthn / browser noise to an i18n key for toasts. */
function mapCeremonyError(
  e: unknown,
  opts?: { intent?: LoginPasskeyIntent },
): Error {
  const err = e as { name?: string; message?: string };
  const msg = (err?.message ?? '').toLowerCase();
  const name = err?.name ?? '';

  // Chrome / SimpleWebAuthn UV failures (before generic NotAllowed cancel).
  if (
    msg.includes('user verification') ||
    msg.includes('could not be verified') ||
    msg.includes('user could not be verified')
  ) {
    return new Error('auth.toastPasskeyUvFailed');
  }

  // Our race abort: probe hang ≈ no discoverable passkey; interactive ≈ slow/missed UI.
  if (name === 'TimeoutError' || msg.includes('auth.toastpasskeytimedout')) {
    return new Error(
      opts?.intent === 'probe'
        ? 'auth.toastPasskeyNotFound'
        : 'auth.toastPasskeyTimedOut',
    );
  }

  // No credential on device (or browser reported none).
  if (
    name === 'NotFoundError' ||
    msg.includes('no credential') ||
    msg.includes('no passkey') ||
    msg.includes('unknown passkey')
  ) {
    return new Error('auth.toastPasskeyNotFound');
  }

  // User dismissed OS sheet / cancelled Touch ID — keep cancel semantics for callers.
  if (
    name === 'NotAllowedError' ||
    name === 'AbortError' ||
    msg.includes('the operation either timed out or was not allowed') ||
    (msg.includes('not allowed') && !msg.includes('auth.toast'))
  ) {
    if (e instanceof Error) return e;
    const cancel = new Error(String(e ?? 'NotAllowedError'));
    cancel.name = 'NotAllowedError';
    return cancel;
  }

  if (
    msg.includes('invalid domain') ||
    msg.includes('relying party') ||
    msg.includes('related origin') ||
    msg.includes('permissions') ||
    name === 'SecurityError'
  ) {
    console.error('[webauthn] ceremony SecurityError — check host_permissions for RP ID', e);
    return new Error('auth.toastPasskeyFailed');
  }
  if (e instanceof Error) return e;
  return new Error(String(e ?? 'auth.toastSignInFailed'));
}

/** In-progress register reservation so availability checks treat own hold as free. */
let pendingRegister: { username: string; sessionToken: string } | null = null;

async function releaseRegisterReservation(
  username: string,
  sessionToken: string,
): Promise<void> {
  try {
    await callEdgeFunction('webauthn-register', {
      action: 'release',
      username,
      sessionToken,
    });
  } catch {
    /* best-effort; TTL + overwrite on retry still recover */
  }
  if (
    pendingRegister?.username === username.toLowerCase() &&
    pendingRegister.sessionToken === sessionToken
  ) {
    pendingRegister = null;
  }
}

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  const sessionToken =
    pendingRegister?.username === normalized
      ? pendingRegister.sessionToken
      : undefined;
  const data = await callEdgeFunction<{ available: boolean }>(
    'webauthn-register',
    { action: 'check', username: normalized, sessionToken },
  );
  return data.available;
}

export async function registerPasskey(
  username: string,
): Promise<SessionUser> {
  await ensureRpHostPermission();

  const normalized = username.trim().toLowerCase();
  const { options, sessionToken } =
    await callEdgeFunction<RegisterOptionsResponse>('webauthn-register', {
      action: 'options',
      username: normalized,
    });

  pendingRegister = { username: normalized, sessionToken };
  const deviceLabelPromise = guessDeviceLabel();

  let attestation;
  try {
    attestation = await runCeremonyWithTimeout(
      () =>
        startRegistration({
          optionsJSON: withRegistrationRpId(options),
        }),
      CEREMONY_TIMEOUT_MS,
    );
  } catch (e) {
    await releaseRegisterReservation(normalized, sessionToken);
    throw mapCeremonyError(e);
  }

  try {
    const deviceLabel = (await deviceLabelPromise).slice(0, DEVICE_LABEL_MAX_LEN);
    const result = await callEdgeFunction<AuthSuccessResponse>(
      'webauthn-register',
      {
        action: 'verify',
        username: normalized,
        sessionToken,
        attestation,
        deviceLabel,
      },
    );

    pendingRegister = null;

    const session: SessionUser = {
      id: result.user.id,
      username: result.user.username,
      avatar_url: result.user.avatar_url,
      karma: result.user.karma,
      token: result.token,
      expiresAt: result.expiresAt,
    };
    if (!session.id || !session.username || !session.token) {
      throw new Error('auth.toastSignInFailed');
    }
    await saveSession(session);
    await rememberCredentialId(attestation.id);
    return session;
  } catch (e) {
    await releaseRegisterReservation(normalized, sessionToken);
    const msg = ((e as Error)?.message ?? '').toLowerCase();
    if (
      msg.includes('user verification') ||
      msg.includes('could not be verified')
    ) {
      throw new Error('auth.toastPasskeyUvFailed');
    }
    if (
      msg.includes('ceremony expired') ||
      msg.includes('reservation expired') ||
      msg.includes('verification failed') ||
      msg.includes('passkey') ||
      msg.includes('could not start passkey')
    ) {
      throw new Error('auth.toastPasskeyFailed');
    }
    throw e;
  }
}

export async function loginPasskey(
  intent: LoginPasskeyIntent = 'interactive',
  opts?: { username?: string },
): Promise<SessionUser> {
  await ensureRpHostPermission();

  const storedIds = await getStoredCredentialIds();
  const username = opts?.username?.trim().toLowerCase();
  let options: PublicKeyCredentialRequestOptionsJSON;
  let challengeId: string;
  try {
    const started = await callEdgeFunction<{
      options: PublicKeyCredentialRequestOptionsJSON;
      challengeId: string;
    }>('webauthn-login', {
      action: 'options',
      username: username || undefined,
    });
    options = started.options;
    challengeId = started.challengeId;
  } catch (e) {
    const msg = ((e as Error)?.message ?? '').toLowerCase();
    if (msg.includes('unknown handle') || msg.includes('unknown passkey')) {
      throw new Error('auth.toastPasskeyNotFound');
    }
    throw e;
  }

  const allowCredentials = allowCredentialsForLogin(
    options.allowCredentials,
    storedIds,
  );
  // Empty allow-list = usernameless picker. Chrome's side panel never shows it
  // and navigator.credentials.get hangs until our timeout.
  if (allowCredentials.length === 0) {
    throw new Error('auth.toastPasskeyNotFound');
  }

  const timeoutMs =
    intent === 'probe'
      ? LOGIN_PROBE_TIMEOUT_MS
      : LOGIN_INTERACTIVE_TIMEOUT_MS;

  let assertion;
  try {
    assertion = await runCeremonyWithTimeout(
      () =>
        startAuthentication({
          optionsJSON: withAuthenticationRpId(
            { ...options, allowCredentials },
            timeoutMs,
          ),
        }),
      timeoutMs,
    );
  } catch (e) {
    throw mapCeremonyError(e, { intent });
  }

  const result = await callEdgeFunction<AuthSuccessResponse>('webauthn-login', {
    action: 'verify',
    assertion,
    challengeId,
  });

  const session: SessionUser = {
    id: result.user.id,
    username: result.user.username,
    avatar_url: result.user.avatar_url,
    karma: result.user.karma,
    token: result.token,
    expiresAt: result.expiresAt,
  };
  if (!session.id || !session.username || !session.token) {
    throw new Error('auth.toastSignInFailed');
  }
  await saveSession(session);
  await rememberCredentialId(assertion.id);
  return session;
}

export async function addPasskeyDevice(
  token: string,
  deviceLabel?: string,
): Promise<void> {
  await ensureRpHostPermission();

  const labelPromise = deviceLabel?.trim()
    ? Promise.resolve(deviceLabel.trim())
    : guessDeviceLabel();

  const { options, challengeId } = await callEdgeFunction<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  }>('webauthn-add-device', { action: 'options' }, token);

  let attestation;
  try {
    attestation = await runCeremonyWithTimeout(
      () =>
        startRegistration({
          optionsJSON: withRegistrationRpId(options),
        }),
      CEREMONY_TIMEOUT_MS,
    );
  } catch (e) {
    throw mapCeremonyError(e);
  }

  const label = (await labelPromise).slice(0, DEVICE_LABEL_MAX_LEN);
  await callEdgeFunction(
    'webauthn-add-device',
    { action: 'verify', attestation, deviceLabel: label, challengeId },
    token,
  );
  await rememberCredentialId(attestation.id);
}

export async function logout(): Promise<void> {
  await clearSession();
}

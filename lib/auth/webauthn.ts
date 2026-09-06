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
import { setPasskeyHint } from './passkeyHint';

/** Brand RP ID — never use chrome-extension:// host (invalid WebAuthn domain). */
const RP_ID =
  (import.meta.env.VITE_WEBAUTHN_RP_ID as string | undefined)?.trim() ||
  'everch.at';

/**
 * Chrome extension side panels often leave navigator.credentials.get pending
 * forever when no discoverable passkey exists for the RP (OS sheet never
 * appears). Login-before-claim uses a short probe; create() gets longer.
 */
const LOGIN_PROBE_TIMEOUT_MS = 7_000;
const CEREMONY_TIMEOUT_MS = 20_000;

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
): PublicKeyCredentialRequestOptionsJSON {
  return {
    ...options,
    rpId: RP_ID,
    userVerification: 'preferred',
  };
}

/** Map raw WebAuthn / browser noise to an i18n key for toasts. */
function mapCeremonyError(e: unknown): Error {
  const err = e as { name?: string; message?: string };
  const msg = (err?.message ?? '').toLowerCase();
  if (err?.name === 'TimeoutError' || msg.includes('auth.toastpasskeytimedout')) {
    return new Error('auth.toastPasskeyTimedOut');
  }
  // Chrome / SimpleWebAuthn UV failures (Touch ID cancel, UV flag missing).
  if (
    msg.includes('user verification') ||
    msg.includes('could not be verified') ||
    msg.includes('user could not be verified')
  ) {
    return new Error('auth.toastPasskeyUvFailed');
  }
  if (
    msg.includes('invalid domain') ||
    msg.includes('relying party') ||
    msg.includes('related origin') ||
    msg.includes('permissions') ||
    err?.name === 'SecurityError'
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
    const result = await callEdgeFunction<AuthSuccessResponse>(
      'webauthn-register',
      {
        action: 'verify',
        username: normalized,
        sessionToken,
        attestation,
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
    await saveSession(session);
    await setPasskeyHint();
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

export async function loginPasskey(): Promise<SessionUser> {
  await ensureRpHostPermission();

  const { options, challengeId } = await callEdgeFunction<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeId: string;
  }>('webauthn-login', { action: 'options' });

  let assertion;
  try {
    assertion = await runCeremonyWithTimeout(
      () =>
        startAuthentication({
          optionsJSON: withAuthenticationRpId(options),
        }),
      LOGIN_PROBE_TIMEOUT_MS,
    );
  } catch (e) {
    throw mapCeremonyError(e);
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
  await saveSession(session);
  await setPasskeyHint();
  return session;
}

export async function addPasskeyDevice(
  token: string,
  deviceLabel?: string,
): Promise<void> {
  await ensureRpHostPermission();

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

  await callEdgeFunction(
    'webauthn-add-device',
    { action: 'verify', attestation, deviceLabel, challengeId },
    token,
  );
  await setPasskeyHint();
}

export async function logout(): Promise<void> {
  await clearSession();
}

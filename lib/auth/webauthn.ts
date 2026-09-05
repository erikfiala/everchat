import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { callEdgeFunction } from '../supabase';
import type { SessionUser } from '../database.types';
import { saveSession, clearSession } from './session';

/** Brand RP ID — never use chrome-extension:// host (invalid WebAuthn domain). */
const RP_ID =
  (import.meta.env.VITE_WEBAUTHN_RP_ID as string | undefined)?.trim() ||
  'everch.at';

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
  };
}

function withAuthenticationRpId(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptionsJSON {
  return {
    ...options,
    rpId: RP_ID,
  };
}

/** Map raw WebAuthn / browser noise to an i18n key for toasts. */
function mapCeremonyError(e: unknown): Error {
  const err = e as { name?: string; message?: string };
  const msg = (err?.message ?? '').toLowerCase();
  if (
    msg.includes('invalid domain') ||
    msg.includes('relying party') ||
    msg.includes('related origin') ||
    err?.name === 'SecurityError'
  ) {
    return new Error('auth.toastPasskeyFailed');
  }
  if (e instanceof Error) return e;
  return new Error(String(e ?? 'auth.toastSignInFailed'));
}

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const data = await callEdgeFunction<{ available: boolean }>(
    'webauthn-register',
    { action: 'check', username },
  );
  return data.available;
}

export async function registerPasskey(
  username: string,
): Promise<SessionUser> {
  const { options, sessionToken } =
    await callEdgeFunction<RegisterOptionsResponse>('webauthn-register', {
      action: 'options',
      username,
    });

  let attestation;
  try {
    attestation = await startRegistration({
      optionsJSON: withRegistrationRpId(options),
    });
  } catch (e) {
    throw mapCeremonyError(e);
  }

  const result = await callEdgeFunction<AuthSuccessResponse>(
    'webauthn-register',
    {
      action: 'verify',
      username,
      sessionToken,
      attestation,
    },
  );

  const session: SessionUser = {
    id: result.user.id,
    username: result.user.username,
    avatar_url: result.user.avatar_url,
    karma: result.user.karma,
    token: result.token,
    expiresAt: result.expiresAt,
  };
  await saveSession(session);
  return session;
}

export async function loginPasskey(): Promise<SessionUser> {
  const { options, challengeId } = await callEdgeFunction<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeId: string;
  }>('webauthn-login', { action: 'options' });

  let assertion;
  try {
    assertion = await startAuthentication({
      optionsJSON: withAuthenticationRpId(options),
    });
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
  return session;
}

export async function addPasskeyDevice(
  token: string,
  deviceLabel?: string,
): Promise<void> {
  const { options, challengeId } = await callEdgeFunction<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  }>('webauthn-add-device', { action: 'options' }, token);

  let attestation;
  try {
    attestation = await startRegistration({
      optionsJSON: withRegistrationRpId(options),
    });
  } catch (e) {
    throw mapCeremonyError(e);
  }

  await callEdgeFunction(
    'webauthn-add-device',
    { action: 'verify', attestation, deviceLabel, challengeId },
    token,
  );
}

export async function logout(): Promise<void> {
  await clearSession();
}

import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { callEdgeFunction } from '../supabase';
import type { SessionUser } from '../database.types';
import { saveSession, clearSession } from './session';

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

  const attestation = await startRegistration({ optionsJSON: options });

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

  const assertion = await startAuthentication({ optionsJSON: options });

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

  const attestation = await startRegistration({ optionsJSON: options });

  await callEdgeFunction(
    'webauthn-add-device',
    { action: 'verify', attestation, deviceLabel, challengeId },
    token,
  );
}

export async function logout(): Promise<void> {
  await clearSession();
}

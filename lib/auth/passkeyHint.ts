/** Local hint that this install previously completed a passkey ceremony. */
export const PASSKEY_HINT_KEY = 'everchat_passkey_hint';
export const PASSKEY_CREDENTIAL_IDS_KEY = 'everchat_passkey_credential_ids';

export async function hasPasskeyHint(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get(PASSKEY_HINT_KEY);
    return result[PASSKEY_HINT_KEY] === true;
  } catch {
    return false;
  }
}

/** Persist after successful register/login so returning users can probe login. */
export async function setPasskeyHint(): Promise<void> {
  try {
    await browser.storage.local.set({ [PASSKEY_HINT_KEY]: true });
  } catch {
    /* ignore */
  }
}

/** Credential ids so login can skip the usernameless picker (hangs in the side panel). */
export async function getStoredCredentialIds(): Promise<string[]> {
  try {
    const result = await browser.storage.local.get(PASSKEY_CREDENTIAL_IDS_KEY);
    const ids = result[PASSKEY_CREDENTIAL_IDS_KEY];
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function rememberCredentialId(id: string): Promise<void> {
  if (!id) return;
  try {
    const ids = await getStoredCredentialIds();
    if (!ids.includes(id)) {
      await browser.storage.local.set({
        [PASSKEY_CREDENTIAL_IDS_KEY]: [...ids, id],
      });
    }
    await setPasskeyHint();
  } catch {
    /* ignore */
  }
}

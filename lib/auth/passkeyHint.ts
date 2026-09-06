/** Local hint that this install previously completed a passkey ceremony. */
export const PASSKEY_HINT_KEY = 'everchat_passkey_hint';

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

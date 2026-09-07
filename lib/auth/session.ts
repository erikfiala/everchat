import type { SessionUser } from '../database.types';

export const SESSION_KEY = 'everchat_session';

export async function loadSession(): Promise<SessionUser | null> {
  try {
    const result = await browser.storage.local.get(SESSION_KEY);
    const session = result[SESSION_KEY] as SessionUser | undefined;
    if (!session?.token || !session.id) return null;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionUser): Promise<void> {
  await browser.storage.local.set({ [SESSION_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await browser.storage.local.remove(SESSION_KEY);
}

export async function updateSessionProfile(
  patch: Partial<
    Pick<SessionUser, 'username' | 'avatar_url' | 'about' | 'website' | 'karma'>
  >,
): Promise<SessionUser | null> {
  const current = await loadSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  await saveSession(next);
  return next;
}

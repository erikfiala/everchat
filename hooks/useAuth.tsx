import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SessionUser } from '@/lib/database.types';
import { loadSession, clearSession, updateSessionProfile } from '@/lib/auth/session';
import {
  registerPasskey,
  loginPasskey,
  logout as doLogout,
  type LoginPasskeyIntent,
} from '@/lib/auth/webauthn';
import { setSupabaseAccessToken, isSupabaseConfigured } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profile';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  configured: boolean;
  showAuthLanding: boolean;
  setShowAuthLanding: (v: boolean) => void;
  requireAuth: () => boolean;
  register: (username: string) => Promise<void>;
  /**
   * Assert existing passkey. Returns true on success.
   * Quiet on user cancel; toasts hard failures (timeout / not found / network).
   * `interactive` (default): long ceremony for explicit CTA.
   * `probe`: short hang-detect window for silent/auto attempts only.
   */
  tryLogin: (opts?: { intent?: LoginPasskeyIntent }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  patchUser: (
    patch: Partial<Pick<SessionUser, 'username' | 'avatar_url' | 'karma'>>,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** User cancelled or similar: fall through to claim. Hard failures toast instead. */
function isExpectedPasskeyMiss(e: unknown): boolean {
  const err = e as { name?: string; message?: string };
  const name = err?.name ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  // Hard timeouts / not-found / network: toast + stay on landing.
  if (
    name === 'TimeoutError' ||
    msg === 'auth.toastpasskeytimedout' ||
    msg === 'auth.toastpasskeynotfound' ||
    msg.includes('network request timed out') ||
    msg.includes('passkeytimedout') ||
    msg.includes('passkeynotfound')
  ) {
    return false;
  }
  return (
    name === 'NotAllowedError' ||
    name === 'AbortError' ||
    name === 'InvalidStateError' ||
    // Raw NotFoundError (if unmapped): quiet fallthrough. Mapped keys toast above.
    name === 'NotFoundError' ||
    msg.includes('not allowed') ||
    // Browser "operation timed out" without our TimeoutError → treat as cancel/miss.
    msg.includes('timed out') ||
    msg.includes('cancel') ||
    msg.includes('no credential') ||
    msg.includes('unknown passkey')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t, tError } = useLocale();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthLanding, setShowAuthLanding] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session) {
        setSupabaseAccessToken(session.token);
        setUser(session);
      }
      setLoading(false);
    })();
  }, []);

  const register = useCallback(
    async (username: string) => {
      try {
        const session = await registerPasskey(username);
        setSupabaseAccessToken(session.token);
        setUser(session);
        setShowAuthLanding(false);
        toast.success(t('auth.toastSignedIn', { username: session.username }));
      } catch (e) {
        toast.error(tError(e, 'auth.toastSignInFailed'));
        throw e;
      }
    },
    [t, tError],
  );

  const tryLogin = useCallback(
    async (opts?: { intent?: LoginPasskeyIntent }): Promise<boolean> => {
      const intent = opts?.intent ?? 'interactive';
      try {
        const session = await loginPasskey(intent);
        setSupabaseAccessToken(session.token);
        setUser(session);
        setShowAuthLanding(false);
        toast.success(
          t('auth.toastWelcomeBack', { username: session.username }),
        );
        return true;
      } catch (e) {
        // Cancel → claim flow. Hard failures rethrow so the landing CTA
        // clears busy, toasts, and stays retryable (not claim).
        if (isExpectedPasskeyMiss(e)) return false;
        toast.error(tError(e, 'auth.toastSignInFailed'));
        throw e;
      }
    },
    [t, tError],
  );

  const logout = useCallback(async () => {
    await doLogout();
    setSupabaseAccessToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await fetchProfile(user.id);
      if (profile) {
        const next = await updateSessionProfile({
          username: profile.username,
          avatar_url: profile.avatar_url,
          karma: profile.karma,
        });
        if (next) setUser(next);
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  const patchUser = useCallback(
    async (
      patch: Partial<Pick<SessionUser, 'username' | 'avatar_url' | 'karma'>>,
    ) => {
      const next = await updateSessionProfile(patch);
      if (next) setUser(next);
    },
    [],
  );

  const requireAuth = useCallback(() => {
    if (user) return true;
    setShowAuthLanding(true);
    return false;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      showAuthLanding,
      setShowAuthLanding,
      requireAuth,
      register,
      tryLogin,
      logout,
      refreshProfile,
      patchUser,
    }),
    [
      user,
      loading,
      showAuthLanding,
      requireAuth,
      register,
      tryLogin,
      logout,
      refreshProfile,
      patchUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}

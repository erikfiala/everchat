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
} from '@/lib/auth/webauthn';
import { setSupabaseAccessToken, isSupabaseConfigured } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profile';
import { toast } from 'sonner';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  configured: boolean;
  showAuthLanding: boolean;
  setShowAuthLanding: (v: boolean) => void;
  requireAuth: () => boolean;
  register: (username: string) => Promise<void>;
  /** Assert existing passkey. Returns true on success. Quiet expected cancel/no-cred failures. */
  tryLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  patchUser: (
    patch: Partial<Pick<SessionUser, 'username' | 'avatar_url' | 'karma'>>,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** User cancelled, no credential on device, or similar: fall through to claim. */
function isExpectedPasskeyMiss(e: unknown): boolean {
  const err = e as { name?: string; message?: string };
  const name = err?.name ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  return (
    name === 'NotAllowedError' ||
    name === 'AbortError' ||
    name === 'InvalidStateError' ||
    name === 'NotFoundError' ||
    msg.includes('not allowed') ||
    msg.includes('timed out') ||
    msg.includes('cancel') ||
    msg.includes('no credential') ||
    msg.includes('unknown passkey')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const register = useCallback(async (username: string) => {
    try {
      const session = await registerPasskey(username);
      setSupabaseAccessToken(session.token);
      setUser(session);
      setShowAuthLanding(false);
      toast.success(`You're in as @${session.username}`);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't finish sign-in. Try again.");
      throw e;
    }
  }, []);

  const tryLogin = useCallback(async (): Promise<boolean> => {
    try {
      const session = await loginPasskey();
      setSupabaseAccessToken(session.token);
      setUser(session);
      setShowAuthLanding(false);
      toast.success(`Welcome back, @${session.username}`);
      return true;
    } catch (e) {
      if (isExpectedPasskeyMiss(e)) return false;
      toast.error((e as Error).message || "Couldn't finish sign-in. Try again.");
      return false;
    }
  }, []);

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

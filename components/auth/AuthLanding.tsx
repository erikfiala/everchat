import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingChats } from './TrendingChats';
import { useAuth } from '@/hooks/useAuth';
import {
  HANDLE_MAX,
  HANDLE_MIN,
  HANDLE_REGEX,
  RESERVED_HANDLES,
} from '@/lib/constants';
import { checkUsernameAvailable } from '@/lib/auth/webauthn';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Step = 'landing' | 'claim';

export function AuthLanding() {
  const { register, login, configured } = useAuth();
  const [step, setStep] = useState<Step>('landing');
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!u) {
      setAvailability('idle');
      return;
    }
    if (!HANDLE_REGEX.test(u) || RESERVED_HANDLES.has(u)) {
      setAvailability('invalid');
      return;
    }
    if (!isSupabaseConfigured) {
      setAvailability('available');
      return;
    }
    setAvailability('checking');
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(u);
        setAvailability(ok ? 'available' : 'taken');
      } catch {
        setAvailability('taken');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const onRegister = async () => {
    const u = username.trim().toLowerCase();
    if (availability !== 'available') return;
    setBusy(true);
    try {
      await register(u);
    } finally {
      setBusy(false);
    }
  };

  const onUnlock = async () => {
    setBusy(true);
    try {
      await login();
    } finally {
      setBusy(false);
    }
  };

  if (step === 'claim') {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-5 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Pick your @handle</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          3–20 characters. Letters, numbers, underscore. No email needed.
        </p>
        <div className="mt-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted-foreground)]">
              @
            </span>
            <Input
              className="pl-7"
              value={username}
              maxLength={HANDLE_MAX}
              minLength={HANDLE_MIN}
              autoFocus
              placeholder="you"
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
            />
          </div>
          <p
            className={cn(
              'mt-2 text-xs',
              availability === 'available' && 'text-[var(--color-success)]',
              (availability === 'taken' || availability === 'invalid') &&
                'text-[var(--color-destructive)]',
              availability === 'checking' && 'text-[var(--color-muted-foreground)]',
            )}
          >
            {availability === 'idle' && ' '}
            {availability === 'checking' && 'Checking…'}
            {availability === 'available' && 'Available'}
            {availability === 'taken' && 'Taken'}
            {availability === 'invalid' && 'Invalid or reserved'}
          </p>
        </div>
        <Button
          className="mt-4 w-full"
          disabled={busy || availability !== 'available'}
          onClick={onRegister}
        >
          {busy ? 'Confirming…' : 'Continue'}
        </Button>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Your device will confirm — no password. If you lose all devices, this
          account can’t be recovered.
        </p>
        <button
          type="button"
          className="mt-4 text-sm text-[var(--color-muted-foreground)] underline"
          onClick={() => setStep('landing')}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-8">
      <div className="mb-6">
        <p className="text-2xl font-bold tracking-tight">Everchat</p>
        <h1 className="mt-3 text-xl font-semibold leading-snug tracking-tight">
          Say what you think — on any page.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          Anonymous comments on this URL. News, gov sites, anything with a link.
          No email.
        </p>
      </div>

      {!configured && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Supabase isn’t configured yet. Add VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY to .env.
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={busy || !configured}
        onClick={() => setStep('claim')}
      >
        Sign in anonymously
      </Button>
      <button
        type="button"
        className="mt-3 text-center text-sm text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
        disabled={busy || !configured}
        onClick={onUnlock}
      >
        Already joined? Unlock
      </button>
      <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        A thread for every page. Tracking noise stripped so the conversation
        sticks to the article, not the ad params.
      </p>

      <TrendingChats />
    </div>
  );
}

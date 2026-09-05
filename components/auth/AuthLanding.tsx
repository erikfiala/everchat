import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
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
  const { register, tryLogin, configured } = useAuth();
  const { t } = useLocale();
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
    const timer = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(u);
        setAvailability(ok ? 'available' : 'taken');
      } catch {
        setAvailability('taken');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [username]);

  const onRegister = async () => {
    const u = username.trim().toLowerCase();
    if (availability !== 'available') return;
    setBusy(true);
    try {
      await register(u);
    } catch {
      // Reservation may have been released; refresh so retry isn't stuck on "taken".
      try {
        const ok = await checkUsernameAvailable(u);
        setAvailability(ok ? 'available' : 'taken');
      } catch {
        setAvailability('available');
      }
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = async () => {
    setBusy(true);
    try {
      const ok = await tryLogin();
      if (!ok) setStep('claim');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'claim') {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-5 py-8">
        <h1 className="text-xl font-semibold tracking-tight">
          {t('auth.claimHandle')}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {t('auth.handleRules')}
        </p>
        <div className="mt-4">
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm leading-none text-[var(--color-muted-foreground)]"
            >
              @
            </span>
            <Input
              className="ps-7"
              value={username}
              maxLength={HANDLE_MAX}
              minLength={HANDLE_MIN}
              autoFocus
              placeholder={t('auth.handlePlaceholder')}
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
            {availability === 'checking' && t('auth.checking')}
            {availability === 'available' && t('auth.available')}
            {availability === 'taken' && t('auth.taken')}
            {availability === 'invalid' && t('auth.invalidOrReserved')}
          </p>
        </div>
        <Button
          className="mt-4 w-full"
          disabled={busy || availability !== 'available'}
          onClick={onRegister}
        >
          {busy ? t('auth.confirming') : t('common.continue')}
        </Button>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          {t('auth.passkeyDisclaimer')}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 w-full text-[var(--color-foreground)]"
          onClick={() => setStep('landing')}
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold leading-snug tracking-tight">
          {t('auth.headline')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {t('auth.lede')}
        </p>
      </div>

      {!configured && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('auth.supabaseNotConfigured')}
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={busy || !configured}
        onClick={onPrimary}
      >
        {busy ? t('auth.working') : t('auth.signInAnonymously')}
      </Button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';
import { isWebApp } from '@/lib/webapp/mode';

const DISMISS_KEY = 'ec-a2hs-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const mq = window.matchMedia?.('(display-mode: standalone)');
  if (mq?.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function AddToHomeScreenModal() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!isWebApp() || isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, []);

  if (!isWebApp()) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const install = async () => {
    const ev = deferred.current;
    if (ev) {
      try {
        await ev.prompt();
        await ev.userChoice;
      } catch {
        /* ignore */
      }
      deferred.current = null;
      dismiss();
      return;
    }
    dismiss();
  };

  const ios = isIos();
  const canPrompt = Boolean(deferred.current);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent
        className="bottom-3 top-auto translate-y-0"
        style={{
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('webapp.a2hsTitle')}</DialogTitle>
          <DialogDescription>
            {ios
              ? t('webapp.a2hsIosBody')
              : canPrompt
                ? t('webapp.a2hsAndroidBody')
                : t('webapp.a2hsAndroidManual')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={dismiss}>
            {t('webapp.a2hsNotNow')}
          </Button>
          {canPrompt && !ios ? (
            <Button type="button" onClick={() => void install()}>
              {t('webapp.a2hsInstall')}
            </Button>
          ) : (
            <Button type="button" onClick={dismiss}>
              {t('webapp.a2hsGotIt')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

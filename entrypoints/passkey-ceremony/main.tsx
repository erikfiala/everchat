import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import {
  PASSKEY_CEREMONY_REQUEST_KEY,
  PASSKEY_CEREMONY_RESULT_KEY,
  type PasskeyCeremonyRequest,
  type PasskeyCeremonyResult,
} from '@/lib/auth/ceremonyWindow';
import { getT, hydrateTranslatorFromStorage } from '@/lib/i18n/runtime';
import '@/entrypoints/sidepanel/style.css';

function requestIdFromHash(): string {
  return window.location.hash.replace(/^#/, '');
}

async function loadRequest(
  requestId: string,
): Promise<PasskeyCeremonyRequest | null> {
  for (let i = 0; i < 20; i++) {
    const stored = await browser.storage.session.get(
      PASSKEY_CEREMONY_REQUEST_KEY,
    );
    const pending = stored[PASSKEY_CEREMONY_REQUEST_KEY] as
      | PasskeyCeremonyRequest
      | undefined;
    if (pending?.requestId === requestId) return pending;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

async function publishResult(result: PasskeyCeremonyResult): Promise<void> {
  await browser.storage.session.set({ [PASSKEY_CEREMONY_RESULT_KEY]: result });
}

function CeremonyPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<PasskeyCeremonyRequest | null>(null);
  const publishedRef = useRef(false);
  const t = getT();

  useEffect(() => {
    void hydrateTranslatorFromStorage().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const requestId = requestIdFromHash();
    if (!requestId) return;
    void loadRequest(requestId).then(setRequest);
  }, []);

  const publish = useCallback(async (result: PasskeyCeremonyResult) => {
    if (publishedRef.current) return;
    publishedRef.current = true;
    await publishResult(result);
  }, []);

  useEffect(() => {
    const requestId = requestIdFromHash();
    const onUnload = () => {
      if (publishedRef.current || !requestId) return;
      publishedRef.current = true;
      void publishResult({
        requestId,
        ok: false,
        errorName: 'NotAllowedError',
        errorMessage: 'NotAllowedError',
      });
    };
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, []);

  const runCreate = useCallback(async () => {
    if (!request || busy) return;
    setBusy(true);
    // #region agent log
    fetch('http://127.0.0.1:7787/ingest/a0037f5f-f79a-4c62-a2cb-b7f3fe1ac169', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'a48dc4',
      },
      body: JSON.stringify({
        sessionId: 'a48dc4',
        hypothesisId: 'H5',
        location: 'entrypoints/passkey-ceremony/main.tsx:runCreate',
        message: 'window create() started',
        data: {
          hasUserActivation: Boolean(navigator.userActivation?.isActive),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const attestation = await startRegistration({
        optionsJSON: request.optionsJSON,
        useAutoRegister: false,
      });
      await publish({
        requestId: request.requestId,
        ok: true,
        attestation,
      });
      window.close();
    } catch (e) {
      const err = e as { name?: string; message?: string };
      await publish({
        requestId: request.requestId,
        ok: false,
        errorName: err?.name || 'Error',
        errorMessage: err?.message || 'auth.toastPasskeyFailed',
      });
      window.close();
    }
  }, [busy, publish, request]);

  if (!ready) return null;

  return (
    <div className="flex h-full min-h-screen flex-col px-5 py-8">
      <h1 className="text-xl font-semibold tracking-tight">
        {t('auth.ceremonyTitle')}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {t('auth.passkeyDisclaimer')}
      </p>
      <Button
        className="mt-6 w-full"
        disabled={busy || !request}
        onClick={() => void runCreate()}
      >
        {busy ? t('auth.confirming') : t('common.continue')}
      </Button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<CeremonyPage />);

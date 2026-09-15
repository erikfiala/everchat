import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';

export const PASSKEY_CEREMONY_REQUEST_KEY = 'everchat_passkey_ceremony_request';
export const PASSKEY_CEREMONY_RESULT_KEY = 'everchat_passkey_ceremony_result';

export type PasskeyCeremonyRequest = {
  requestId: string;
  optionsJSON: PublicKeyCredentialCreationOptionsJSON;
  timeoutMs: number;
};

export type PasskeyCeremonyResult =
  | { requestId: string; ok: true; attestation: RegistrationResponseJSON }
  | {
      requestId: string;
      ok: false;
      errorName: string;
      errorMessage: string;
    };

/** Side-panel create() often never shows OS UI. A real window/tab does. */
export function shouldRunCreateInWindow(ctx: {
  isWebApp: boolean;
  isPreview: boolean;
  canOpenExtensionWindow: boolean;
}): boolean {
  return !ctx.isWebApp && !ctx.isPreview && ctx.canOpenExtensionWindow;
}

export function canOpenExtensionWindow(): boolean {
  return typeof browser !== 'undefined' && typeof browser.windows?.create === 'function';
}

export function ceremonyPageUrl(requestId: string): string {
  return `${browser.runtime.getURL('/passkey-ceremony.html')}#${requestId}`;
}

export function errorFromCeremonyResult(result: Extract<
  PasskeyCeremonyResult,
  { ok: false }
>): Error {
  const err = new Error(result.errorMessage || 'auth.toastPasskeyFailed');
  err.name = result.errorName || 'Error';
  return err;
}

function isCeremonyResult(value: unknown): value is PasskeyCeremonyResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<PasskeyCeremonyResult>;
  return typeof row.requestId === 'string' && typeof row.ok === 'boolean';
}

async function openCeremonyPage(url: string): Promise<{
  windowId?: number;
  popup: Window | null;
}> {
  try {
    const popup = window.open(
      url,
      'everchat-passkey',
      'popup=yes,width=420,height=560',
    );
    if (popup) return { popup };
  } catch {
    /* popup blocked — fall through */
  }
  const created = await browser.windows.create({
    url,
    type: 'popup',
    focused: true,
    width: 420,
    height: 560,
  });
  return { windowId: created?.id, popup: null };
}

async function closeCeremonyPage(handle: {
  windowId?: number;
  popup: Window | null;
}): Promise<void> {
  try {
    handle.popup?.close();
  } catch {
    /* ignore */
  }
  if (handle.windowId != null) {
    await browser.windows.remove(handle.windowId).catch(() => undefined);
  }
}

function pageClosed(handle: { windowId?: number; popup: Window | null }): boolean {
  try {
    if (handle.popup && handle.popup.closed) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Run navigator.credentials.create in a focused extension window so Chrome
 * can attach the OS passkey sheet. The side panel cannot.
 */
export async function runRegistrationInWindow(
  optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  timeoutMs: number,
): Promise<RegistrationResponseJSON> {
  const requestId = crypto.randomUUID();
  const request: PasskeyCeremonyRequest = {
    requestId,
    optionsJSON,
    timeoutMs,
  };
  await browser.storage.session.set({ [PASSKEY_CEREMONY_REQUEST_KEY]: request });
  await browser.storage.session.remove(PASSKEY_CEREMONY_RESULT_KEY);

  const handle = await openCeremonyPage(ceremonyPageUrl(requestId));

  return new Promise<RegistrationResponseJSON>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      finish(
        undefined,
        Object.assign(new Error('auth.toastPasskeyTimedOut'), {
          name: 'TimeoutError',
        }),
      );
    }, timeoutMs);

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'session') return;
      const value = changes[PASSKEY_CEREMONY_RESULT_KEY]?.newValue;
      if (!isCeremonyResult(value) || value.requestId !== requestId) return;
      // #region agent log
      fetch('http://127.0.0.1:7787/ingest/a0037f5f-f79a-4c62-a2cb-b7f3fe1ac169', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'a48dc4',
        },
        body: JSON.stringify({
          sessionId: 'a48dc4',
          hypothesisId: 'H6',
          location: 'lib/auth/ceremonyWindow.ts:onChanged',
          message: 'window ceremony result',
          data: {
            ok: value.ok,
            errorName: value.ok ? null : value.errorName,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (value.ok) finish(value.attestation);
      else finish(undefined, errorFromCeremonyResult(value));
    };

    const onWindowRemoved = (windowId: number) => {
      if (handle.windowId == null || windowId !== handle.windowId) return;
      const cancel = new Error('NotAllowedError');
      cancel.name = 'NotAllowedError';
      finish(undefined, cancel);
    };

    const poll = setInterval(() => {
      if (pageClosed(handle)) {
        const cancel = new Error('NotAllowedError');
        cancel.name = 'NotAllowedError';
        finish(undefined, cancel);
      }
    }, 400);

    function finish(attestation?: RegistrationResponseJSON, error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      browser.storage.onChanged.removeListener(onChanged);
      browser.windows.onRemoved?.removeListener(onWindowRemoved);
      void closeCeremonyPage(handle);
      void browser.storage.session.remove([
        PASSKEY_CEREMONY_REQUEST_KEY,
        PASSKEY_CEREMONY_RESULT_KEY,
      ]);
      if (attestation) resolve(attestation);
      else reject(error ?? new Error('auth.toastPasskeyFailed'));
    }

    browser.storage.onChanged.addListener(onChanged);
    browser.windows.onRemoved?.addListener(onWindowRemoved);
  });
}

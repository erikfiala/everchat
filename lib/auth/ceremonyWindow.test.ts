import { describe, expect, it } from 'vitest';
import {
  errorFromCeremonyResult,
  shouldRunCreateInWindow,
} from './ceremonyWindow';

describe('shouldRunCreateInWindow', () => {
  it('opens a window only in the Chrome extension side panel', () => {
    expect(
      shouldRunCreateInWindow({
        isWebApp: false,
        isPreview: false,
        canOpenExtensionWindow: true,
      }),
    ).toBe(true);
  });

  it('keeps in-page create() on everch.at/app and theme preview', () => {
    expect(
      shouldRunCreateInWindow({
        isWebApp: true,
        isPreview: false,
        canOpenExtensionWindow: false,
      }),
    ).toBe(false);
    expect(
      shouldRunCreateInWindow({
        isWebApp: false,
        isPreview: true,
        canOpenExtensionWindow: false,
      }),
    ).toBe(false);
  });
});

describe('errorFromCeremonyResult', () => {
  it('preserves ceremony error name for toast mapping', () => {
    const err = errorFromCeremonyResult({
      requestId: 'r',
      ok: false,
      errorName: 'TimeoutError',
      errorMessage: 'auth.toastPasskeyTimedOut',
    });
    expect(err.name).toBe('TimeoutError');
    expect(err.message).toBe('auth.toastPasskeyTimedOut');
  });
});

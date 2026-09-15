import { afterEach, describe, expect, it } from 'vitest';
import { isPreviewMode } from '@/lib/preview/mode';
import { isWebApp } from '@/lib/webapp/mode';

function stubWindow(flags: {
  webapp?: boolean;
  preview?: boolean;
} = {}) {
  (globalThis as { window: Window }).window = {
    __EC_WEBAPP__: flags.webapp,
    __EC_PREVIEW__: flags.preview,
  } as Window;
}

describe('webapp vs preview mode flags', () => {
  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it('isWebApp is true only when __EC_WEBAPP__ is set', () => {
    stubWindow();
    expect(isWebApp()).toBe(false);
    stubWindow({ webapp: true });
    expect(isWebApp()).toBe(true);
    expect(isPreviewMode()).toBe(false);
  });

  it('does not treat preview as webapp', () => {
    stubWindow({ preview: true });
    expect(isPreviewMode()).toBe(true);
    expect(isWebApp()).toBe(false);
  });

  it('keeps the flags independent when both are set', () => {
    stubWindow({ webapp: true, preview: true });
    expect(isWebApp()).toBe(true);
    expect(isPreviewMode()).toBe(true);
  });
});

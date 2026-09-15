import { describe, expect, it } from 'vitest';
import {
  IOS_HOME_INDICATOR_FALLBACK_PX,
  isAppleTouchDevice,
  resolveSafeBottomPx,
} from './safeArea';

describe('resolveSafeBottomPx', () => {
  it('keeps a real measured inset', () => {
    expect(
      resolveSafeBottomPx(34, { standalone: true, appleTouch: true }),
    ).toBe(34);
  });

  it('falls back on standalone iPhone when WebKit reports 0', () => {
    expect(
      resolveSafeBottomPx(0, { standalone: true, appleTouch: true }),
    ).toBe(IOS_HOME_INDICATOR_FALLBACK_PX);
  });

  it('stays 0 in the browser / extension', () => {
    expect(
      resolveSafeBottomPx(0, { standalone: false, appleTouch: true }),
    ).toBe(0);
    expect(
      resolveSafeBottomPx(0, { standalone: true, appleTouch: false }),
    ).toBe(0);
  });
});

describe('isAppleTouchDevice', () => {
  it('detects iPhone UAs', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('detects iPadOS desktop UA', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('rejects desktop', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
});

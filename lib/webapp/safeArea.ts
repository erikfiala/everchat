/**
 * iOS PWAs sometimes report env(safe-area-inset-*) as 0 on cold start
 * even though the home indicator still overlays the webview. Measure once
 * the DOM is up and publish CSS vars the chrome can consume.
 *
 * Top inset: with opaque `black` status-bar style, WebKit already lays out
 * below the status bar and reports 0 — do NOT invent a fallback there or you
 * get a double-spaced empty black band under the system bar.
 */

const TOP_VAR = '--ec-safe-top';
const BOTTOM_VAR = '--ec-safe-bottom';

/** Home-indicator height on notched iPhones when WebKit reports 0. */
export const IOS_HOME_INDICATOR_FALLBACK_PX = 34;

export function isStandaloneDisplay(
  nav: Navigator & { standalone?: boolean } = window.navigator,
  matchMedia: typeof window.matchMedia = window.matchMedia.bind(window),
): boolean {
  if (nav.standalone) return true;
  return matchMedia?.('(display-mode: standalone)')?.matches === true;
}

export function isAppleTouchDevice(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = window.navigator,
): boolean {
  if (/iPhone|iPad|iPod/i.test(nav.userAgent)) return true;
  // iPadOS desktop UA
  return nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
}

type SafeOpts = { standalone: boolean; appleTouch: boolean };

/** Prefer the measured inset; fall back on standalone iOS when WebKit reports 0. */
export function resolveSafeBottomPx(
  measured: number,
  opts: SafeOpts,
): number {
  if (measured > 0) return measured;
  if (opts.standalone && opts.appleTouch) return IOS_HOME_INDICATOR_FALLBACK_PX;
  return 0;
}

/**
 * Use the measured top inset only. Opaque `black` status bar already insets
 * the layout; a fallback here stacks a second gap under the system bar.
 */
export function resolveSafeTopPx(measured: number): number {
  return measured > 0 ? measured : 0;
}

function measureInset(side: 'top' | 'bottom'): number {
  const el = document.createElement('div');
  el.style.cssText =
    side === 'top'
      ? 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)'
      : 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(el);
  const value =
    parseFloat(
      side === 'top'
        ? getComputedStyle(el).paddingTop
        : getComputedStyle(el).paddingBottom,
    ) || 0;
  el.remove();
  return value;
}

function publish(): void {
  const root = document.documentElement;
  const top = measureInset('top');
  const bottom = measureInset('bottom');
  const opts = {
    standalone: isStandaloneDisplay(),
    appleTouch: isAppleTouchDevice(),
  };
  root.style.setProperty(TOP_VAR, `${resolveSafeTopPx(top)}px`);
  root.style.setProperty(
    BOTTOM_VAR,
    `${resolveSafeBottomPx(bottom, opts)}px`,
  );
}

/** Call from the webapp boot path after `ec-webapp` is on <html>. */
export function installSafeAreaVars(): void {
  const run = () => {
    try {
      publish();
    } catch {
      /* ignore measurement failures */
    }
  };

  run();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(run);
  }
  // Cold-start WebKit often resolves insets a beat late.
  window.setTimeout(run, 50);
  window.setTimeout(run, 300);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(run, 100);
  });
  window.visualViewport?.addEventListener('resize', run);
}

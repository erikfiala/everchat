/**
 * Marketing “Try Everchat on Mobile” bottom sheet (~720px and below).
 * Include on marketing pages only — skip /app, /panel, /m.
 */
(function () {
  var STORAGE_KEY = 'ec-mobile-sheet-dismissed';
  var MQ = '(max-width: 720px)';

  function dismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    var el = document.getElementById('ec-mobile-sheet');
    if (el) el.remove();
    document.documentElement.classList.remove('ec-mobile-sheet-open');
  }

  function applyI18n(root) {
    var catalog = window.__ecCatalog;
    if (!catalog) return;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key || catalog[key] == null) return;
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, catalog[key]);
      else el.textContent = catalog[key];
    });
  }

  function mount() {
    if (dismissed()) return;
    if (!window.matchMedia(MQ).matches) return;
    if (document.getElementById('ec-mobile-sheet')) return;

    var bar = document.createElement('div');
    bar.id = 'ec-mobile-sheet';
    bar.className = 'ec-mobile-sheet';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Try Everchat on Mobile');

    var link = document.createElement('a');
    link.href = '/app';
    link.className = 'ec-mobile-sheet-cta';
    link.setAttribute('data-i18n', 'www.mobileSheetCta');
    link.textContent = 'Try Everchat on Mobile';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'ec-mobile-sheet-close';
    close.setAttribute('data-i18n', 'www.mobileSheetDismiss');
    close.setAttribute('data-i18n-attr', 'aria-label');
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', dismiss);

    bar.appendChild(link);
    bar.appendChild(close);
    document.body.appendChild(bar);
    document.documentElement.classList.add('ec-mobile-sheet-open');
    applyI18n(bar);
  }

  function onChange(mq) {
    if (!mq.matches) {
      var el = document.getElementById('ec-mobile-sheet');
      if (el) el.remove();
      document.documentElement.classList.remove('ec-mobile-sheet-open');
      return;
    }
    mount();
  }

  function boot() {
    var mq = window.matchMedia(MQ);
    onChange(mq);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onChange);
    }
    // Catalog may load after this script; retry once shortly.
    window.setTimeout(function () {
      var el = document.getElementById('ec-mobile-sheet');
      if (el) applyI18n(el);
      else mount();
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

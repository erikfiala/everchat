/**
 * Marketing “preview Everchat” sticky bar above .doc-bar.
 * Include on marketing pages only — skip /app, /panel, /m.
 */
(function () {
  var STORAGE_KEY = 'ec-preview-bar-dismissed';

  function dismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  }

  function setOffset(px) {
    document.documentElement.style.setProperty(
      '--ec-preview-bar-offset',
      (px || 0) + 'px'
    );
  }

  function clearOpen() {
    document.documentElement.classList.remove('ec-preview-bar-open');
    setOffset(0);
  }

  function syncOffset() {
    var el = document.getElementById('ec-preview-bar');
    setOffset(el ? el.offsetHeight : 0);
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    var el = document.getElementById('ec-preview-bar');
    if (el) el.remove();
    clearOpen();
    window.removeEventListener('resize', syncOffset);
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
    if (document.getElementById('ec-preview-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'ec-preview-bar';
    bar.className = 'ec-preview-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Preview Everchat before downloading the extension');

    var link = document.createElement('a');
    link.href = '/app';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'ec-preview-bar-cta';
    link.setAttribute('data-i18n', 'www.previewBarCta');
    link.textContent = 'Preview Everchat before downloading the extension';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'ec-preview-bar-close';
    close.setAttribute('data-i18n', 'www.previewBarDismiss');
    close.setAttribute('data-i18n-attr', 'aria-label');
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', dismiss);

    bar.appendChild(link);
    bar.appendChild(close);

    var docBar = document.querySelector('.doc-bar');
    if (docBar && docBar.parentNode) {
      docBar.parentNode.insertBefore(bar, docBar);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    document.documentElement.classList.add('ec-preview-bar-open');
    applyI18n(bar);
    bar.setAttribute('aria-label', link.textContent);
    syncOffset();
    window.addEventListener('resize', syncOffset);
  }

  function boot() {
    mount();
    // Catalog may load after this script; retry once shortly.
    window.setTimeout(function () {
      var el = document.getElementById('ec-preview-bar');
      if (el) {
        applyI18n(el);
        var cta = el.querySelector('.ec-preview-bar-cta');
        if (cta) el.setAttribute('aria-label', cta.textContent);
        syncOffset();
      } else {
        mount();
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

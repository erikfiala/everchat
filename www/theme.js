/**
 * Published theme page at /themes/:slug — preview + import into the extension.
 */
(function () {
  var current = null;
  var slug = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function t(key, vars) {
    return window.ECTheme.t(key, vars);
  }

  function parseSlug() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] === 'themes' && parts[1] !== 'new') {
      try {
        return decodeURIComponent(parts[1]);
      } catch (e) {
        return null;
      }
    }
    var params = new URLSearchParams(location.search);
    var q = params.get('id') || params.get('slug');
    return q || null;
  }

  function setStatus(text, kind) {
    var el = $('[data-ec-theme-status]');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-ok', kind === 'ok');
  }

  function downloadJson() {
    if (!current) return;
    var blob = new Blob([JSON.stringify(window.ECTheme.exportTheme(current), null, 2)], {
      type: 'application/json',
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (slug || 'theme') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyJson() {
    if (!current) return;
    var text = JSON.stringify(window.ECTheme.exportTheme(current), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setStatus(t('www.themeCopied'), 'ok');
        },
        function () {
          setStatus(t('www.themeImportFail'), 'error');
        },
      );
    }
  }

  function showInstall(show) {
    var el = $('[data-ec-theme-install]');
    if (el) el.hidden = !show;
  }

  function importTheme() {
    if (!slug) return;
    var btn = $('[data-ec-theme-import]');
    if (btn) btn.disabled = true;
    setStatus(t('www.themeImporting'), '');
    showInstall(false);
    window.ECTheme.importToExtension(slug).then(function (res) {
      if (btn) btn.disabled = false;
      if (res && res.ok) {
        setStatus(t('www.themeImportOk'), 'ok');
        return;
      }
      showInstall(true);
      setStatus(t('www.themeImportNeedExt'), 'error');
    });
  }

  function showReady(row, theme) {
    current = theme;
    var title = $('[data-ec-theme-title]');
    var by = $('[data-ec-theme-by]');
    var ready = $('[data-ec-theme-ready]');
    var preview = $('[data-ec-preview]');
    if (title) title.textContent = theme.name;
    if (by) by.textContent = t('www.themeBy', { name: theme.author });
    document.title = theme.name + ' - Everchat';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://everch.at/themes/' + encodeURIComponent(row.slug);
    var frame = $('[data-ec-preview-frame]');
    if (frame) {
      window.ECTheme.bindPreviewFrame(frame, function () {
        return current;
      });
      window.ECTheme.postPreviewTheme(frame, theme);
    }
    if (ready) ready.hidden = false;
  }

  function showError() {
    var error = $('[data-ec-theme-error]');
    var text = $('[data-ec-theme-error-text]');
    if (text) text.textContent = t('www.themeNotFound');
    if (error) error.hidden = false;
  }

  function boot() {
    slug = parseSlug();
    var root = $('[data-ec-theme-detail]');
    var exportBtn = $('[data-ec-theme-export]');
    var copyBtn = $('[data-ec-theme-copy]');
    var importBtn = $('[data-ec-theme-import]');
    if (exportBtn) exportBtn.addEventListener('click', downloadJson);
    if (copyBtn) copyBtn.addEventListener('click', copyJson);
    if (importBtn) importBtn.addEventListener('click', importTheme);

    if (!slug || !window.ECTheme.isValidSlug(slug)) {
      if (root) root.setAttribute('aria-busy', 'false');
      showError();
      return;
    }

    var cfg = window.EC_SUPABASE;
    if (!cfg || !cfg.url) {
      if (root) root.setAttribute('aria-busy', 'false');
      showError();
      return;
    }

    window.ECTheme.fetchTheme(cfg, slug)
      .then(function (row) {
        if (root) root.setAttribute('aria-busy', 'false');
        var theme = window.ECTheme.rowToTheme(row);
        if (!row || !theme) {
          showError();
          return;
        }
        showReady(row, theme);
        var params = new URLSearchParams(location.search);
        if (params.get('import') === '1') importTheme();
      })
      .catch(function () {
        if (root) root.setAttribute('aria-busy', 'false');
        showError();
      });
  }

  window.ECTheme.waitForCatalog(boot);
})();

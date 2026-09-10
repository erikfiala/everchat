/**
 * Published theme page at /themes/:slug — preview + import into the extension.
 */
(function () {
  var current = null;
  var currentRow = null;
  var slug = null;
  var liked = false;
  var appearance = 'light';

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

  function showInstall(show) {
    var el = $('[data-ec-theme-install]');
    if (el) el.hidden = !show;
  }

  function paintLike() {
    var btn = $('[data-ec-theme-like]');
    if (!btn || !currentRow) return;
    if (window.ECTheme.isDefaultThemeSlug(currentRow.slug)) {
      btn.hidden = true;
      return;
    }
    var count =
      typeof currentRow.like_count === 'number' ? currentRow.like_count : 0;
    btn.hidden = false;
    btn.classList.toggle('is-liked', liked);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      liked ? t('www.themeUnlike') : t('www.themeLike'),
    );
    var icon = btn.querySelector('svg');
    if (icon) icon.setAttribute('fill', liked ? 'currentColor' : 'none');
    var n = btn.querySelector('[data-ec-theme-like-count]');
    if (n) n.textContent = String(count);
  }

  function onLike() {
    var cfg = window.EC_SUPABASE;
    var btn = $('[data-ec-theme-like]');
    if (!slug || !currentRow) return;
    if (window.ECTheme.isDefaultThemeSlug(slug)) return;
    if (btn) btn.disabled = true;
    var prev = liked;
    var prevCount =
      typeof currentRow.like_count === 'number' ? currentRow.like_count : 0;
    liked = !prev;
    currentRow.like_count = Math.max(0, prevCount + (prev ? -1 : 1));
    paintLike();
    window.ECTheme.toggleThemeLike(cfg, slug).then(
      function (data) {
        if (btn) btn.disabled = false;
        liked = !!data.liked;
        if (typeof data.like_count === 'number') {
          currentRow.like_count = data.like_count;
        }
        paintLike();
      },
      function () {
        if (btn) btn.disabled = false;
        liked = prev;
        currentRow.like_count = prevCount;
        paintLike();
        setStatus(t('www.themeLikeFail'), 'error');
      },
    );
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
    currentRow = row;
    var title = $('[data-ec-theme-title]');
    var by = $('[data-ec-theme-by]');
    var ready = $('[data-ec-theme-ready]');
    var preview = $('[data-ec-preview]');
    var importBtn = $('[data-ec-theme-import]');
    if (title) title.textContent = theme.name;
    if (by) {
      window.ECTheme.paintThemeByline(by, row, t);
    }
    if (importBtn) {
      importBtn.hidden = false;
      importBtn.textContent = t('www.themeImport');
    }
    var remixLink = $('[data-ec-theme-remix]');
    if (remixLink) {
      remixLink.hidden = false;
      remixLink.href = window.ECTheme.remixBuilderHref(row.slug);
      remixLink.textContent = t('www.themeRemix');
    }
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
        return { theme: current, appearance: appearance };
      });
      window.ECTheme.postPreviewTheme(frame, theme, appearance);
    }
    if (ready) ready.hidden = false;
    var actions = $('[data-ec-theme-actions]');
    if (actions) actions.hidden = false;
    paintLike();
  }

  function showError() {
    var error = $('[data-ec-theme-error]');
    var text = $('[data-ec-theme-error-text]');
    if (text) text.textContent = t('www.themeNotFound');
    if (error) error.hidden = false;
  }

  function syncAppearanceTabs() {
    document.querySelectorAll('[data-ec-appearance]').forEach(function (btn) {
      var on = btn.getAttribute('data-ec-appearance') === appearance;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bindAppearanceTabs() {
    document.querySelectorAll('[data-ec-appearance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-ec-appearance');
        if (mode !== 'light' && mode !== 'dark') return;
        appearance = mode;
        syncAppearanceTabs();
        if (!current) return;
        var frame = $('[data-ec-preview-frame]');
        if (frame) window.ECTheme.postPreviewTheme(frame, current, appearance);
      });
    });
    syncAppearanceTabs();
  }

  function boot() {
    slug = parseSlug();
    var root = $('[data-ec-theme-detail]');
    var importBtn = $('[data-ec-theme-import]');
    var likeBtn = $('[data-ec-theme-like]');
    if (importBtn) importBtn.addEventListener('click', importTheme);
    if (likeBtn) likeBtn.addEventListener('click', onLike);
    bindAppearanceTabs();

    if (!slug || !window.ECTheme.isValidSlug(slug)) {
      if (root) root.setAttribute('aria-busy', 'false');
      showError();
      return;
    }

    var cfg = window.EC_SUPABASE;
    if ((!cfg || !cfg.url) && !window.ECTheme.isDefaultThemeSlug(slug)) {
      if (root) root.setAttribute('aria-busy', 'false');
      showError();
      return;
    }

    var likesP =
      cfg && cfg.url
        ? window.ECTheme.fetchMyThemeLikes(cfg)
        : Promise.resolve([]);
    Promise.all([window.ECTheme.fetchTheme(cfg || {}, slug), likesP])
      .then(function (parts) {
        if (root) root.setAttribute('aria-busy', 'false');
        var row = parts[0];
        var theme = window.ECTheme.rowToTheme(row);
        if (!row || !theme) {
          showError();
          return;
        }
        liked = (parts[1] || []).indexOf(row.slug) !== -1;
        showReady(row, theme);
        var params = new URLSearchParams(location.search);
        if (params.get('import') === '1') importTheme();
      })
      .catch(function () {
        if (root) root.setAttribute('aria-busy', 'false');
        if (window.ECTheme.isDefaultThemeSlug(slug)) {
          var row = window.ECTheme.defaultThemeRow();
          var theme = window.ECTheme.rowToTheme(row);
          if (theme) {
            showReady(row, theme);
            return;
          }
        }
        showError();
      });
  }

  window.ECTheme.waitForCatalog(boot);
})();

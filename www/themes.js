/**
 * Published theme gallery at /themes.
 */
(function () {
  var allRows = [];
  var liked = {};
  var sort = 'best';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function t(key, vars) {
    return window.ECTheme.t(key, vars);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
  }

  function swatches(tokens) {
    var row = document.createElement('div');
    row.className = 'theme-swatches';
    row.setAttribute('aria-hidden', 'true');
    window.ECTheme.swatchColors(tokens).forEach(function (hex) {
      var dot = document.createElement('span');
      dot.className = 'theme-swatch';
      dot.style.background = hex;
      row.appendChild(dot);
    });
    return row;
  }

  function likeButton(row) {
    var on = !!liked[row.slug];
    var count = typeof row.like_count === 'number' ? row.like_count : 0;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-like' + (on ? ' is-liked' : '');
    btn.setAttribute('data-ec-theme-like', row.slug);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? t('www.themeUnlike') : t('www.themeLike'));
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="' +
      (on ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
    var n = document.createElement('span');
    n.className = 'theme-like-count';
    n.textContent = String(count);
    btn.appendChild(n);
    return btn;
  }

  function card(row) {
    var theme = window.ECTheme.rowToTheme(row);
    var article = document.createElement('article');
    article.className = 'theme-card';
    var a = document.createElement('a');
    a.className = 'theme-card-link';
    a.href = '/themes/' + encodeURIComponent(row.slug);
    var name = document.createElement('p');
    name.className = 'theme-card-name';
    name.textContent = row.name || '';
    var by = document.createElement('p');
    by.className = 'theme-card-by';
    by.textContent = t('www.themeBy', { name: row.author_name || '' });
    a.appendChild(swatches(theme ? theme.tokens : row.tokens));
    a.appendChild(name);
    a.appendChild(by);
    article.appendChild(a);
    article.appendChild(likeButton(row));
    return article;
  }

  function syncSortButtons() {
    $$('[data-ec-themes-sort]').forEach(function (btn) {
      var on = btn.getAttribute('data-ec-themes-sort') === sort;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function render() {
    var list = $('[data-ec-themes-list]');
    var status = $('[data-ec-themes-status]');
    if (!list) return;
    list.replaceChildren();
    var rows = window.ECTheme.sortThemes(
      window.ECTheme.withDefaultTheme(allRows),
      sort,
    );
    setHidden(status, true);
    rows.forEach(function (row) {
      if (!row || !window.ECTheme.isValidSlug(row.slug)) return;
      if (!window.ECTheme.rowToTheme(row)) return;
      list.appendChild(card(row));
    });
    syncSortButtons();
  }

  function applyLikeResult(slug, data) {
    liked[slug] = !!data.liked;
    if (!data.liked) delete liked[slug];
    allRows.forEach(function (row) {
      if (row && row.slug === slug && typeof data.like_count === 'number') {
        row.like_count = data.like_count;
      }
    });
    if (window.ECTheme.isDefaultThemeSlug(slug) && typeof data.like_count === 'number') {
      var found = allRows.some(function (row) {
        return row && row.slug === slug;
      });
      if (!found) {
        allRows.push(
          Object.assign(window.ECTheme.defaultThemeRow(), {
            like_count: data.like_count,
          }),
        );
      }
    }
    render();
  }

  function onLike(slug) {
    var cfg = window.EC_SUPABASE;
    var btn = $('[data-ec-theme-like="' + slug + '"]');
    if (btn) btn.disabled = true;
    var prev = !!liked[slug];
    var row = null;
    allRows.some(function (r) {
      if (r && r.slug === slug) {
        row = r;
        return true;
      }
      return false;
    });
    if (!row && window.ECTheme.isDefaultThemeSlug(slug)) {
      row = window.ECTheme.defaultThemeRow();
      allRows.push(row);
    }
    var prevCount = row && typeof row.like_count === 'number' ? row.like_count : 0;
    liked[slug] = !prev;
    if (!liked[slug]) delete liked[slug];
    if (row) row.like_count = Math.max(0, prevCount + (prev ? -1 : 1));
    render();
    window.ECTheme.toggleThemeLike(cfg, slug).then(
      function (data) {
        applyLikeResult(slug, data);
      },
      function () {
        liked[slug] = prev;
        if (!prev) delete liked[slug];
        if (row) row.like_count = prevCount;
        render();
        var error = $('[data-ec-themes-error]');
        var errorText = $('[data-ec-themes-error-text]');
        setHidden(error, false);
        if (errorText) errorText.textContent = t('www.themeLikeFail');
      },
    );
  }

  function load() {
    var root = $('[data-ec-themes]');
    var error = $('[data-ec-themes-error]');
    var errorText = $('[data-ec-themes-error-text]');
    var cfg = window.EC_SUPABASE;
    if (root) root.setAttribute('aria-busy', 'true');
    setHidden(error, true);
    allRows = [];
    render();
    if (!cfg || !cfg.url || !cfg.anonKey) {
      if (root) root.setAttribute('aria-busy', 'false');
      return;
    }
    Promise.all([
      window.ECTheme.fetchThemes(cfg),
      window.ECTheme.fetchMyThemeLikes(cfg),
    ])
      .then(function (parts) {
        allRows = parts[0] || [];
        liked = {};
        (parts[1] || []).forEach(function (slug) {
          if (window.ECTheme.isValidSlug(slug)) liked[slug] = true;
        });
        render();
        if (root) root.setAttribute('aria-busy', 'false');
      })
      .catch(function () {
        allRows = [];
        render();
        if (root) root.setAttribute('aria-busy', 'false');
        setHidden(error, false);
        if (errorText) errorText.textContent = t('www.themesError');
      });
  }

  function boot() {
    var retry = $('[data-ec-themes-retry]');
    if (retry) retry.addEventListener('click', load);
    $$('[data-ec-themes-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-ec-themes-sort');
        if (next !== 'best' && next !== 'new') return;
        sort = next;
        render();
      });
    });
    var list = $('[data-ec-themes-list]');
    if (list) {
      list.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-ec-theme-like]');
        if (!btn) return;
        event.preventDefault();
        onLike(btn.getAttribute('data-ec-theme-like'));
      });
    }
    load();
  }

  window.ECTheme.waitForCatalog(boot);
})();

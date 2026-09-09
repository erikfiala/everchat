/**
 * Published theme gallery at /themes.
 */
(function () {
  function $(sel, root) {
    return (root || document).querySelector(sel);
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

  function card(row) {
    var theme = window.ECTheme.rowToTheme(row);
    var a = document.createElement('a');
    a.className = 'theme-card';
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
    return a;
  }

  function render(rows) {
    var list = $('[data-ec-themes-list]');
    var status = $('[data-ec-themes-status]');
    var error = $('[data-ec-themes-error]');
    if (!list) return;
    list.replaceChildren();
    setHidden(error, true);
    if (!rows || !rows.length) {
      setHidden(status, false);
      status.textContent = t('www.themesEmpty');
      return;
    }
    setHidden(status, true);
    rows.forEach(function (row) {
      if (!row || !window.ECTheme.isValidSlug(row.slug)) return;
      if (!window.ECTheme.rowToTheme(row)) return;
      list.appendChild(card(row));
    });
    if (!list.childElementCount) {
      setHidden(status, false);
      status.textContent = t('www.themesEmpty');
    }
  }

  function load() {
    var root = $('[data-ec-themes]');
    var error = $('[data-ec-themes-error]');
    var errorText = $('[data-ec-themes-error-text]');
    var cfg = window.EC_SUPABASE;
    if (root) root.setAttribute('aria-busy', 'true');
    if (!cfg || !cfg.url || !cfg.anonKey) {
      if (root) root.setAttribute('aria-busy', 'false');
      setHidden(error, false);
      if (errorText) errorText.textContent = t('www.themesError');
      return;
    }
    window.ECTheme.fetchThemes(cfg)
      .then(function (rows) {
        render(rows);
        if (root) root.setAttribute('aria-busy', 'false');
      })
      .catch(function () {
        if (root) root.setAttribute('aria-busy', 'false');
        setHidden(error, false);
        if (errorText) errorText.textContent = t('www.themesError');
      });
  }

  function boot() {
    var retry = $('[data-ec-themes-retry]');
    if (retry) retry.addEventListener('click', load);
    load();
  }

  window.ECTheme.waitForCatalog(boot);
})();

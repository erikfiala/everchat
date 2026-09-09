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

  var CHECK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var sortRoot = null;
  var sortOpen = false;
  var sortActive = -1;

  function sortLabel(mode) {
    return mode === 'new' ? t('chat.sortNew') : t('chat.sortBest');
  }

  function sortOptions() {
    if (!sortRoot) return [];
    return $$('[role="option"]', sortRoot);
  }

  function closeSort(restoreFocus) {
    if (!sortRoot || !sortOpen) {
      sortOpen = false;
      return;
    }
    var trigger = $('[data-ec-themes-sort-trigger]', sortRoot);
    var menu = $('[data-ec-themes-sort-menu]', sortRoot);
    if (menu) menu.hidden = true;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (restoreFocus) trigger.focus();
    }
    sortRoot.classList.remove('is-open');
    sortOpen = false;
    sortActive = -1;
  }

  function highlightSort(index) {
    var opts = sortOptions();
    if (!opts.length) return;
    if (index < 0) index = opts.length - 1;
    if (index >= opts.length) index = 0;
    sortActive = index;
    opts.forEach(function (opt, i) {
      opt.classList.toggle('is-active', i === index);
    });
    var trigger = $('[data-ec-themes-sort-trigger]', sortRoot);
    if (trigger && opts[index].id) {
      trigger.setAttribute('aria-activedescendant', opts[index].id);
    }
    if (opts[index].scrollIntoView) {
      opts[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function openSort() {
    if (!sortRoot) return;
    var trigger = $('[data-ec-themes-sort-trigger]', sortRoot);
    var menu = $('[data-ec-themes-sort-menu]', sortRoot);
    if (!trigger || !menu) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    sortRoot.classList.add('is-open');
    sortOpen = true;
    var opts = sortOptions();
    var selected = -1;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('aria-selected') === 'true') {
        selected = i;
        break;
      }
    }
    highlightSort(selected >= 0 ? selected : 0);
  }

  function toggleSort() {
    if (sortOpen) closeSort(false);
    else openSort();
  }

  function commitSort(next) {
    if (next !== 'best' && next !== 'new') return;
    sort = next;
    closeSort(true);
    render();
  }

  function syncSortSelect() {
    if (!sortRoot) return;
    var label = $('[data-ec-themes-sort-label]', sortRoot);
    var menu = $('[data-ec-themes-sort-menu]', sortRoot);
    var trigger = $('[data-ec-themes-sort-trigger]', sortRoot);
    if (label) label.textContent = sortLabel(sort);
    if (!menu) return;
    var wasOpen = sortOpen;
    if (wasOpen) closeSort(false);
    var uid = menu.id || (trigger && trigger.id) || 'ec-themes-sort';
    menu.innerHTML = '';
    [
      { value: 'best', label: t('chat.sortBest') },
      { value: 'new', label: t('chat.sortNew') },
    ].forEach(function (item) {
      var opt = document.createElement('div');
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-value', item.value);
      opt.id = uid + '-opt-' + item.value;
      opt.className = 'ec-select-item';
      if (item.value === sort) opt.setAttribute('aria-selected', 'true');
      var check = document.createElement('span');
      check.className = 'ec-select-check';
      check.setAttribute('aria-hidden', 'true');
      if (item.value === sort) check.innerHTML = CHECK_SVG;
      var text = document.createElement('span');
      text.className = 'ec-select-item-label';
      text.textContent = item.label;
      opt.appendChild(check);
      opt.appendChild(text);
      menu.appendChild(opt);
    });
    if (wasOpen) openSort();
  }

  function handleSortKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!sortOpen) {
        openSort();
        if (e.key === 'ArrowUp') highlightSort(sortOptions().length - 1);
        return;
      }
      highlightSort(sortActive + (e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (e.key === 'Home' && sortOpen) {
      e.preventDefault();
      highlightSort(0);
      return;
    }
    if (e.key === 'End' && sortOpen) {
      e.preventDefault();
      highlightSort(sortOptions().length - 1);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && sortOpen) {
      e.preventDefault();
      var opts = sortOptions();
      if (opts[sortActive]) commitSort(opts[sortActive].getAttribute('data-value'));
      return;
    }
    if (e.key === 'Escape' && sortOpen) {
      e.preventDefault();
      closeSort(true);
      return;
    }
    if (e.key === 'Tab' && sortOpen) closeSort(false);
  }

  function enhanceSortSelect() {
    sortRoot = $('[data-ec-themes-sort]');
    if (!sortRoot || sortRoot.getAttribute('data-ec-enhanced') === '1') {
      syncSortSelect();
      return;
    }
    sortRoot.setAttribute('data-ec-enhanced', '1');
    var trigger = $('[data-ec-themes-sort-trigger]', sortRoot);
    var menu = $('[data-ec-themes-sort-menu]', sortRoot);
    if (!trigger || !menu) return;
    trigger.id = trigger.id || 'ec-themes-sort-trigger';
    menu.id = menu.id || 'ec-themes-sort-menu';
    trigger.setAttribute('aria-controls', menu.id);
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      toggleSort();
    });
    trigger.addEventListener('keydown', handleSortKey);
    menu.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });
    menu.addEventListener('click', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (opt && menu.contains(opt)) commitSort(opt.getAttribute('data-value'));
    });
    menu.addEventListener('mousemove', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (!opt) return;
      var i = sortOptions().indexOf(opt);
      if (i >= 0) highlightSort(i);
    });
    document.addEventListener('mousedown', function (e) {
      if (sortOpen && sortRoot && !sortRoot.contains(e.target)) closeSort(false);
    });
    document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
      sel.addEventListener('change', syncSortSelect);
    });
    syncSortSelect();
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

  function createTile() {
    var a = document.createElement('a');
    a.className = 'theme-card theme-card-new';
    a.href = '/themes/new';
    a.setAttribute('aria-label', t('www.themesNew'));
    var icon = document.createElement('span');
    icon.className = 'theme-card-new-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
    var label = document.createElement('span');
    label.className = 'theme-card-new-label';
    label.textContent = t('www.themesNew');
    a.appendChild(icon);
    a.appendChild(label);
    return a;
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
    by.textContent = t('www.themeBy', {
      name: window.ECTheme.formatThemeAuthor(row.author_name),
    });
    a.appendChild(swatches(theme ? theme.tokens : row.tokens));
    a.appendChild(name);
    a.appendChild(by);
    article.appendChild(a);
    if (!window.ECTheme.isDefaultThemeSlug(row.slug)) {
      article.appendChild(likeButton(row));
    }
    return article;
  }

  function sortedGalleryRows() {
    var catalog = window.ECTheme.withDefaultTheme(allRows);
    var pinned = [];
    var rest = [];
    catalog.forEach(function (row) {
      if (row && window.ECTheme.isDefaultThemeSlug(row.slug)) pinned.push(row);
      else rest.push(row);
    });
    return pinned.concat(window.ECTheme.sortThemes(rest, sort));
  }

  function render() {
    var list = $('[data-ec-themes-list]');
    var status = $('[data-ec-themes-status]');
    if (!list) return;
    list.replaceChildren();
    list.appendChild(createTile());
    var rows = sortedGalleryRows();
    setHidden(status, true);
    rows.forEach(function (row) {
      if (!row || !window.ECTheme.isValidSlug(row.slug)) return;
      if (!window.ECTheme.rowToTheme(row)) return;
      list.appendChild(card(row));
    });
    syncSortSelect();
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
    if (window.ECTheme.isDefaultThemeSlug(slug)) return;
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
    enhanceSortSelect();
    var list = $('[data-ec-themes-list]');
    if (list) {
      list.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-ec-theme-like]');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        onLike(btn.getAttribute('data-ec-theme-like'));
      });
    }
    load();
  }

  window.ECTheme.waitForCatalog(boot);
})();

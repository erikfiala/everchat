/**
 * Load public trending rooms from Supabase (anon-readable trending_pages view).
 * Config: window.EC_SUPABASE from supabase-public.js
 */
(function () {
  var LIMIT = 8;

  function t(key, vars) {
    var catalog = window.__ecCatalog || {};
    var template = catalog[key];
    if (template == null) return null;
    if (!vars) return String(template);
    return String(template).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars[k] == null ? '' : String(vars[k]);
    });
  }

  function hostFromCanonical(canonical) {
    if (!canonical) return '';
    var slash = canonical.indexOf('/');
    return slash === -1 ? canonical : canonical.slice(0, slash);
  }

  function httpsUrl(canonical) {
    return 'https://' + canonical;
  }

  /** Lucide `globe` paths — matches extension Favicon fallback. */
  function globeIcon() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    var circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    svg.appendChild(circle);

    var meridian = document.createElementNS(ns, 'path');
    meridian.setAttribute('d', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20');
    svg.appendChild(meridian);

    var equator = document.createElementNS(ns, 'path');
    equator.setAttribute('d', 'M2 12h20');
    svg.appendChild(equator);

    return svg;
  }

  function setFavicon(fav, url) {
    fav.replaceChildren();
    if (!url) {
      fav.appendChild(globeIcon());
      return;
    }
    var img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.width = 16;
    img.height = 16;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function () {
      fav.replaceChildren(globeIcon());
    };
    fav.appendChild(img);
  }

  function setStatus(el, text) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  }

  function renderEmpty(list) {
    list.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'trending-empty';
    box.textContent = t('www.trendingEmpty') || 'Nothing trending yet.';
    list.appendChild(box);
  }

  function renderRows(list, rows) {
    list.innerHTML = '';
    rows.forEach(function (row) {
      var a = document.createElement('a');
      a.className = 'trending-row';
      a.href = httpsUrl(row.canonical_url);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      var fav = document.createElement('span');
      fav.className = 'trending-fav';
      fav.setAttribute('aria-hidden', 'true');
      setFavicon(fav, row.favicon_url);

      var body = document.createElement('span');
      body.className = 'trending-body';

      var title = document.createElement('span');
      title.className = 'trending-title';
      title.textContent = row.title || hostFromCanonical(row.canonical_url) || row.canonical_url;

      var host = document.createElement('span');
      host.className = 'trending-host';
      host.textContent = hostFromCanonical(row.canonical_url);

      var meta = document.createElement('span');
      meta.className = 'trending-meta';
      meta.textContent =
        t('www.trendingTalking', { count: row.message_count || 0 }) ||
        (row.message_count || 0) + ' talking';

      body.appendChild(title);
      body.appendChild(host);
      body.appendChild(meta);
      a.appendChild(fav);
      a.appendChild(body);
      list.appendChild(a);
    });
  }

  function loadTrending() {
    var root = document.querySelector('[data-ec-trending]');
    if (!root) return;
    var list = root.querySelector('[data-ec-trending-list]');
    var status = root.querySelector('[data-ec-trending-status]');
    var cfg = window.EC_SUPABASE;
    if (!list || !cfg || !cfg.url || !cfg.anonKey) {
      setStatus(status, '');
      renderEmpty(list);
      return;
    }

    setStatus(status, t('common.loading') || 'Loading…');

    var endpoint =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/trending_pages?select=*&limit=' +
      LIMIT;

    fetch(endpoint, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        Accept: 'application/json',
      },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('trending ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length) {
          setStatus(status, '');
          renderEmpty(list);
          return;
        }
        setStatus(status, '');
        renderRows(list, rows);
      })
      .catch(function () {
        setStatus(status, '');
        renderEmpty(list);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Wait a tick so i18n.js can populate __ecCatalog when both scripts load.
    var tries = 0;
    function boot() {
      tries += 1;
      if (window.__ecCatalog || tries > 20) {
        loadTrending();
        return;
      }
      setTimeout(boot, 50);
    }
    boot();

    document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        setTimeout(loadTrending, 100);
      });
    });
  });
})();

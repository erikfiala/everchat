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
      a.href = row.url || httpsUrl(row.canonical_url);
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

      var online = row.online_count || 0;
      var live = online > 0;

      var meta = document.createElement('span');
      meta.className = live ? 'trending-meta' : 'trending-meta is-offline';

      if (live) {
        var dot = document.createElement('span');
        dot.className = 'trending-online-dot';
        dot.setAttribute('aria-hidden', 'true');
        meta.appendChild(dot);
      }

      var talking = document.createElement('span');
      talking.textContent =
        t('www.trendingTalking', { count: online }) || online + ' online';
      meta.appendChild(talking);

      body.appendChild(title);
      body.appendChild(host);
      body.appendChild(meta);
      a.appendChild(fav);
      a.appendChild(body);
      list.appendChild(a);
    });
  }

  var lastRows = null;
  var pollTimer = null;

  function supabaseHeaders(cfg) {
    return {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.anonKey,
      Accept: 'application/json',
    };
  }

  function mergeOnlineCounts(rows, counts) {
    var map = {};
    (counts || []).forEach(function (row) {
      if (row && row.canonical_url) {
        map[row.canonical_url] = row.online_count || 0;
      }
    });
    return rows.map(function (row) {
      var next = {};
      Object.keys(row).forEach(function (key) {
        next[key] = row[key];
      });
      next.online_count = map[row.canonical_url] || 0;
      return next;
    });
  }

  function fetchOnlineCounts(cfg, urls) {
    if (!urls.length) return Promise.resolve([]);
    var endpoint =
      cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/page_online_counts';
    var headers = supabaseHeaders(cfg);
    headers['Content-Type'] = 'application/json';
    return fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ p_canonical_urls: urls }),
    }).then(function (res) {
      if (!res.ok) throw new Error('presence ' + res.status);
      return res.json();
    });
  }

  function paintRows(list, rows) {
    lastRows = rows;
    renderRows(list, rows);
  }

  function refreshOnlineCounts(list) {
    var cfg = window.EC_SUPABASE;
    if (!list || !cfg || !cfg.url || !cfg.anonKey || !lastRows || !lastRows.length) {
      return;
    }
    var urls = lastRows
      .map(function (row) {
        return row.canonical_url;
      })
      .filter(Boolean);
    fetchOnlineCounts(cfg, urls)
      .then(function (counts) {
        paintRows(list, mergeOnlineCounts(lastRows, counts));
      })
      .catch(function () {
        /* keep last paint */
      });
  }

  function ensurePoll() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      var root = document.querySelector('[data-ec-trending]');
      if (!root) return;
      refreshOnlineCounts(root.querySelector('[data-ec-trending-list]'));
    }, 30000);
  }

  function loadTrending() {
    var root = document.querySelector('[data-ec-trending]');
    if (!root) return;
    var list = root.querySelector('[data-ec-trending-list]');
    var status = root.querySelector('[data-ec-trending-status]');
    var cfg = window.EC_SUPABASE;
    if (!list || !cfg || !cfg.url || !cfg.anonKey) {
      setStatus(status, '');
      lastRows = null;
      renderEmpty(list);
      return;
    }

    setStatus(status, t('common.loading') || 'Loading…');

    var endpoint =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/trending_pages?select=*&limit=' +
      LIMIT;

    fetch(endpoint, {
      headers: supabaseHeaders(cfg),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('trending ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length) {
          setStatus(status, '');
          lastRows = null;
          renderEmpty(list);
          return;
        }
        var urls = rows
          .map(function (row) {
            return row.canonical_url;
          })
          .filter(Boolean);
        return fetchOnlineCounts(cfg, urls)
          .then(function (counts) {
            setStatus(status, '');
            paintRows(list, mergeOnlineCounts(rows, counts));
            ensurePoll();
          })
          .catch(function () {
            setStatus(status, '');
            paintRows(list, mergeOnlineCounts(rows, []));
            ensurePoll();
          });
      })
      .catch(function () {
        setStatus(status, '');
        lastRows = null;
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

/**
 * Load public trending rooms from Supabase (anon-readable trending_pages view).
 * If nothing is trending, fall back to latest active_pages ("Latest chats").
 * Live "N online" via Realtime postgres_changes on page_online_counts;
 * REST poll is the fallback. Config: window.EC_SUPABASE from supabase-public.js
 */
(function () {
  var LIMIT = 15;
  var lastRows = null;
  var presence = null;

  function setStatus(el, text) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  }

  function setSectionMode(root, mode) {
    var R = window.ECRooms;
    var titleEl = root.querySelector('h2');
    var title;
    var aria;
    if (mode === 'latest') {
      title = R.t('www.latestTitle') || 'Latest chats';
      aria = R.t('www.latestAria') || title;
    } else {
      title = R.t('www.trendingTitle') || 'Trending chats';
      aria = R.t('www.trendingAria') || title;
    }
    if (titleEl) titleEl.textContent = title;
    root.setAttribute('aria-label', aria);
  }

  function paintRows(list, rows) {
    lastRows = rows;
    window.ECRooms.renderRows(list, rows);
  }

  function showEmpty(list) {
    var R = window.ECRooms;
    lastRows = null;
    if (presence) presence.stop();
    R.renderEmpty(
      list,
      R.t('www.browseEmpty') ||
        R.t('www.trendingEmpty') ||
        'No chats yet.',
    );
  }

  function paintWithPresence(list, rows) {
    paintRows(list, rows);
    if (!presence) {
      presence = window.ECRooms.createPresence(
        function () {
          return lastRows;
        },
        function (next) {
          paintRows(list, next);
        },
      );
    }
    presence.start();
  }

  function loadLatestFallback(root, list, status, cfg) {
    var R = window.ECRooms;
    setSectionMode(root, 'latest');
    return R.fetchPages(cfg, { limit: LIMIT }).then(function (rows) {
      if (!rows || !rows.length) {
        setStatus(status, '');
        showEmpty(list);
        return;
      }
      return R.withOnlineCounts(cfg, rows).then(function (merged) {
        setStatus(status, '');
        paintWithPresence(list, merged);
      });
    });
  }

  function loadTrending() {
    var R = window.ECRooms;
    var root = document.querySelector('[data-ec-trending]');
    if (!root) return;
    if (presence) presence.stop();
    var list = root.querySelector('[data-ec-trending-list]');
    var status = root.querySelector('[data-ec-trending-status]');
    var cfg = window.EC_SUPABASE;
    if (!list) return;
    if (!cfg || !cfg.url || !cfg.anonKey) {
      setStatus(status, '');
      setSectionMode(root, 'trending');
      showEmpty(list);
      return;
    }

    setSectionMode(root, 'trending');
    setStatus(status, R.t('common.loading') || 'Loading…');

    R.fetchTrending(cfg, LIMIT)
      .then(function (rows) {
        if (rows && rows.length) {
          return R.withOnlineCounts(cfg, rows).then(function (merged) {
            setStatus(status, '');
            setSectionMode(root, 'trending');
            paintWithPresence(list, merged);
          });
        }
        return loadLatestFallback(root, list, status, cfg);
      })
      .catch(function () {
        return loadLatestFallback(root, list, status, cfg).catch(function () {
          setStatus(status, '');
          setSectionMode(root, 'trending');
          showEmpty(list);
        });
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.ECRooms.waitForCatalog(loadTrending);

    document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        setTimeout(loadTrending, 100);
      });
    });

    window.addEventListener('pagehide', function () {
      if (presence) presence.stop();
    });
  });
})();

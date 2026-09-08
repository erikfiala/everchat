/**
 * Load public trending rooms from Supabase (anon-readable trending_pages view).
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

  function paintRows(list, rows) {
    lastRows = rows;
    window.ECRooms.renderRows(list, rows);
  }

  function loadTrending() {
    var R = window.ECRooms;
    var root = document.querySelector('[data-ec-trending]');
    if (!root) return;
    if (presence) presence.stop();
    var list = root.querySelector('[data-ec-trending-list]');
    var status = root.querySelector('[data-ec-trending-status]');
    var cfg = window.EC_SUPABASE;
    if (!list || !cfg || !cfg.url || !cfg.anonKey) {
      setStatus(status, '');
      lastRows = null;
      R.renderEmpty(list);
      return;
    }

    setStatus(status, R.t('common.loading') || 'Loading…');

    R.fetchTrending(cfg, LIMIT)
      .then(function (rows) {
        if (!rows || !rows.length) {
          setStatus(status, '');
          lastRows = null;
          if (presence) presence.stop();
          R.renderEmpty(list);
          return;
        }
        return R.withOnlineCounts(cfg, rows).then(function (merged) {
          setStatus(status, '');
          paintRows(list, merged);
          if (!presence) {
            presence = R.createPresence(
              function () {
                return lastRows;
              },
              function (next) {
                paintRows(list, next);
              },
            );
          }
          presence.start();
        });
      })
      .catch(function () {
        setStatus(status, '');
        lastRows = null;
        if (presence) presence.stop();
        R.renderEmpty(list);
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

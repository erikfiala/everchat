/**
 * Browse every public room (pages table, anon SELECT) with server-side search
 * and 90-at-a-time lazy load. Cards reuse ECRooms helpers from rooms.js.
 */
(function () {
  var PAGE_SIZE = 90;
  var DEBOUNCE_MS = 300;

  var rows = [];
  var offset = 0;
  var hasMore = false;
  var loading = false;
  var query = '';
  var requestId = 0;
  var presence = null;
  var debounceTimer = null;
  var observer = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text || '';
  }

  function currentQuery() {
    var input = $('[data-ec-browse-search]');
    return input ? String(input.value || '').trim() : query;
  }

  function readQueryFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      return String(params.get('q') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function writeQueryToUrl(q) {
    try {
      var url = new URL(window.location.href);
      if (q) url.searchParams.set('q', q);
      else url.searchParams.delete('q');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {
      /* ignore */
    }
  }

  function replaceList(list, nextRows) {
    rows = nextRows;
    window.ECRooms.renderRows(list, nextRows);
  }

  function appendList(list, added) {
    rows = rows.concat(added);
    window.ECRooms.renderRows(list, added, { append: true });
  }

  function paintExisting(list) {
    if (!rows.length) return;
    window.ECRooms.renderRows(list, rows);
  }

  function setBusy(root, busy) {
    if (root) root.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function loadPage(reset) {
    var R = window.ECRooms;
    var root = $('[data-ec-browse]');
    if (!root) return;
    var list = $('[data-ec-browse-list]', root);
    var status = $('[data-ec-browse-status]', root);
    var errorBox = $('[data-ec-browse-error]', root);
    var end = $('[data-ec-browse-end]', root);
    var more = $('[data-ec-browse-more]', root);
    var cfg = window.EC_SUPABASE;

    if (!list) return;

    if (!cfg || !cfg.url || !cfg.anonKey) {
      setHidden(errorBox, true);
      setHidden(end, true);
      setHidden(more, true);
      setText(status, '');
      R.renderEmpty(list, R.t('www.browseError') || "Couldn't load chats.");
      setBusy(root, false);
      return;
    }

    if (loading) return;
    loading = true;
    setBusy(root, true);

    if (reset) {
      offset = 0;
      hasMore = false;
      rows = [];
      if (presence) presence.stop();
      list.innerHTML = '';
      setHidden(errorBox, true);
      setHidden(end, true);
      setText(
        status,
        R.t('common.loading') || 'Loading…',
      );
      setHidden(status, false);
    } else {
      setHidden(more, false);
      setText(more, R.t('common.loading') || 'Loading…');
    }

    var id = (requestId += 1);
    var q = query;

    R.fetchPages(cfg, { limit: PAGE_SIZE, offset: offset, q: q })
      .then(function (page) {
        if (id !== requestId) return;
        return R.withOnlineCounts(cfg, page || []).then(function (merged) {
          if (id !== requestId) return;
          var batch = merged || [];
          if (reset) replaceList(list, batch);
          else appendList(list, batch);
          offset += batch.length;
          hasMore = batch.length >= PAGE_SIZE;
          setText(status, '');
          setHidden(status, true);
          setHidden(errorBox, true);
          setHidden(more, true);
          if (!rows.length) {
            setHidden(end, true);
            R.renderEmpty(
              list,
              q
                ? R.t('www.browseEmptySearch') || 'No chats match that search.'
                : R.t('www.browseEmpty') || 'No chats yet.',
            );
          } else {
            setHidden(end, hasMore);
            if (!hasMore) {
              setText(end, R.t('www.browseEnd') || "That's all of them.");
            }
          }
          if (rows.length) {
            if (!presence) {
              presence = R.createPresence(
                function () {
                  return rows;
                },
                function (next) {
                  rows = next;
                  paintExisting(list);
                },
              );
            }
            presence.start();
          }
        });
      })
      .catch(function () {
        if (id !== requestId) return;
        setText(status, '');
        setHidden(status, true);
        setHidden(more, true);
        if (!rows.length) {
          R.renderEmpty(
            list,
            R.t('www.browseError') || "Couldn't load chats.",
          );
        }
        setHidden(errorBox, false);
        var errText = $('[data-ec-browse-error-text]', errorBox || root);
        setText(errText, R.t('www.browseError') || "Couldn't load chats.");
      })
      .then(function () {
        if (id !== requestId) return;
        loading = false;
        setBusy(root, false);
      });
  }

  function searchNow(q, pushUrl) {
    query = String(q || '').trim();
    if (pushUrl !== false) writeQueryToUrl(query);
    loadPage(true);
  }

  function observeSentinel() {
    var sentinel = $('[data-ec-browse-sentinel]');
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      function (entries) {
        var hit = entries.some(function (e) {
          return e.isIntersecting;
        });
        if (hit && hasMore && !loading) loadPage(false);
      },
      { root: null, rootMargin: '480px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
  }

  function bindSearch() {
    var input = $('[data-ec-browse-search]');
    if (!input) return;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        searchNow(input.value, true);
      }, DEBOUNCE_MS);
    });
    input.addEventListener('search', function () {
      clearTimeout(debounceTimer);
      searchNow(input.value, true);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounceTimer);
        searchNow(input.value, true);
      }
    });
  }

  function bindRetry() {
    var btn = $('[data-ec-browse-retry]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      loadPage(rows.length === 0);
    });
  }

  function bindLang() {
    document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        setTimeout(function () {
          var list = $('[data-ec-browse-list]');
          if (list && rows.length) paintExisting(list);
          var end = $('[data-ec-browse-end]');
          if (end && !end.hidden) {
            setText(
              end,
              window.ECRooms.t('www.browseEnd') || "That's all of them.",
            );
          }
        }, 100);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var initial = readQueryFromUrl();
    var input = $('[data-ec-browse-search]');
    if (input && initial) input.value = initial;
    query = initial;

    bindSearch();
    bindRetry();
    bindLang();
    observeSentinel();

    window.ECRooms.waitForCatalog(function () {
      loadPage(true);
    });

    window.addEventListener('pagehide', function () {
      if (presence) presence.stop();
      if (observer) observer.disconnect();
    });
  });
})();

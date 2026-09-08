/**
 * Load public trending rooms from Supabase (anon-readable trending_pages view).
 * Live "N online" via Realtime postgres_changes on page_online_counts;
 * REST poll is the fallback. Config: window.EC_SUPABASE from supabase-public.js
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

  function displayUrl(value) {
    if (!value) return '';
    var trimmed = String(value).trim();
    if (!trimmed || trimmed === '/') return trimmed;
    trimmed = trimmed.replace(/^https?:\/\//i, '');
    trimmed = trimmed.replace(/^www\./i, '');
    return trimmed.replace(/\/+$/, '');
  }

  function hostFromCanonical(canonical) {
    if (!canonical) return '';
    var slash = canonical.indexOf('/');
    var host = slash === -1 ? canonical : canonical.slice(0, slash);
    return displayUrl(host || canonical);
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
      title.textContent =
        row.title ||
        displayUrl(row.canonical_url) ||
        hostFromCanonical(row.canonical_url);

      var host = document.createElement('span');
      host.className = 'trending-host';
      host.textContent =
        displayUrl(row.canonical_url) || hostFromCanonical(row.canonical_url);

      var online = row.online_count || 0;
      var live = online > 0;

      var meta = document.createElement('span');
      meta.className = live ? 'trending-meta' : 'trending-meta is-offline';

      var dot = document.createElement('span');
      dot.className = live
        ? 'trending-online-dot'
        : 'trending-online-dot is-offline';
      dot.setAttribute('aria-hidden', 'true');
      meta.appendChild(dot);

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
  var presenceSocket = null;
  var presenceHeartbeat = null;
  var presenceHbRef = 1;

  function payloadUrl(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function payloadCount(value) {
    if (typeof value === 'number' && isFinite(value)) {
      return value < 0 ? 0 : value;
    }
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * Patch listed rooms from a page_online_counts change.
   * Same rules as lib/presence.ts applyOnlineCountChange — never insert rooms.
   */
  function applyOnlineCountChange(rows, payload) {
    var rec = payload && payload.new;
    var oldRec = payload && payload.old;
    var fromNew = payloadUrl(rec && rec.canonical_url);
    var fromOld = payloadUrl(oldRec && oldRec.canonical_url);
    var eventType = String((payload && payload.eventType) || '').toUpperCase();
    var isDelete = eventType === 'DELETE' || (!fromNew && Boolean(fromOld));
    var url = isDelete ? fromOld : fromNew;
    if (!url) return rows;
    var found = false;
    var i;
    for (i = 0; i < rows.length; i += 1) {
      if (rows[i].canonical_url === url) {
        found = true;
        break;
      }
    }
    if (!found) return rows;
    var count = isDelete ? 0 : payloadCount(rec && rec.online_count);
    return rows.map(function (row) {
      if (row.canonical_url !== url) return row;
      var next = {};
      Object.keys(row).forEach(function (key) {
        next[key] = row[key];
      });
      next.online_count = count;
      return next;
    });
  }

  function changeFromRealtimeMessage(msg) {
    if (!msg || typeof msg !== 'object') return null;
    var event = String(msg.event || '');
    var payload = msg.payload || {};
    var data = payload.data;
    var type = '';
    var rec = null;
    var oldRec = null;

    if (data && typeof data === 'object') {
      type = String(data.type || data.eventType || '').toUpperCase();
      rec = data.record || data.new || null;
      oldRec = data.old_record || data.old || null;
    } else if (payload.record || payload.new || payload.old_record || payload.old) {
      type = String(payload.type || payload.eventType || '').toUpperCase();
      rec = payload.record || payload.new || null;
      oldRec = payload.old_record || payload.old || null;
    }

    if (!type && event && event !== 'postgres_changes') {
      type = event.toUpperCase();
    }
    if (type !== 'INSERT' && type !== 'UPDATE' && type !== 'DELETE') {
      return null;
    }

    return {
      eventType: type,
      new: rec && typeof rec === 'object' ? rec : {},
      old: oldRec && typeof oldRec === 'object' ? oldRec : {},
    };
  }

  function realtimeWsUrl(cfg) {
    var http = cfg.url.replace(/\/$/, '');
    var ws = http.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
    return (
      ws +
      '/realtime/v1/websocket?apikey=' +
      encodeURIComponent(cfg.anonKey) +
      '&vsn=1.0.0'
    );
  }

  function closePresence() {
    if (presenceHeartbeat) {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
    }
    if (!presenceSocket) return;
    var ws = presenceSocket;
    presenceSocket = null;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch (e) {
      /* ignore */
    }
  }

  function sendJson(ws, body) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(body));
  }

  function subscribePresence(list) {
    var cfg = window.EC_SUPABASE;
    closePresence();
    if (
      !list ||
      !cfg ||
      !cfg.url ||
      !cfg.anonKey ||
      typeof WebSocket === 'undefined'
    ) {
      return;
    }

    var ws;
    try {
      ws = new WebSocket(realtimeWsUrl(cfg));
    } catch (e) {
      return;
    }

    presenceSocket = ws;
    presenceHbRef = 1;

    ws.onopen = function () {
      if (presenceSocket !== ws) return;
      sendJson(ws, {
        topic: 'realtime:public:page_online_counts',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { enabled: false },
            postgres_changes: [
              { event: '*', schema: 'public', table: 'page_online_counts' },
            ],
            private: false,
            access_token: cfg.anonKey,
          },
          access_token: cfg.anonKey,
        },
        ref: '1',
        join_ref: '1',
      });
      presenceHeartbeat = setInterval(function () {
        if (presenceSocket !== ws) return;
        presenceHbRef += 1;
        sendJson(ws, {
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: String(presenceHbRef),
        });
      }, 25000);
    };

    ws.onmessage = function (ev) {
      if (presenceSocket !== ws || !lastRows || !lastRows.length) return;
      var msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      var change = changeFromRealtimeMessage(msg);
      if (!change) return;
      var next = applyOnlineCountChange(lastRows, change);
      if (next === lastRows) return;
      paintRows(list, next);
    };

    ws.onerror = function () {
      /* REST poll remains the fallback */
    };

    ws.onclose = function () {
      if (presenceSocket !== ws) return;
      if (presenceHeartbeat) {
        clearInterval(presenceHeartbeat);
        presenceHeartbeat = null;
      }
      presenceSocket = null;
    };
  }

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
    }, 12000);
  }

  function loadTrending() {
    var root = document.querySelector('[data-ec-trending]');
    if (!root) return;
    closePresence();
    var list = root.querySelector('[data-ec-trending-list]');
    var status = root.querySelector('[data-ec-trending-status]');
    var cfg = window.EC_SUPABASE;
    if (!list || !cfg || !cfg.url || !cfg.anonKey) {
      setStatus(status, '');
      lastRows = null;
      closePresence();
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
          closePresence();
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
            subscribePresence(list);
          })
          .catch(function () {
            setStatus(status, '');
            paintRows(list, mergeOnlineCounts(rows, []));
            ensurePoll();
            subscribePresence(list);
          });
      })
      .catch(function () {
        setStatus(status, '');
        lastRows = null;
        closePresence();
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

    window.addEventListener('pagehide', closePresence);
  });
})();

/**
 * Shared room-card helpers for everch.at trending + chats.
 * Config: window.EC_SUPABASE from supabase-public.js
 */
(function (global) {
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

  function hrefFromPage(row) {
    if (!row) return '';
    if (row.url) return row.url;
    return row.canonical_url ? httpsUrl(row.canonical_url) : '';
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
    fav.appendChild(globeIcon());
    if (!url) return;
    var img = document.createElement('img');
    img.alt = '';
    img.width = 16;
    img.height = 16;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onload = function () {
      fav.replaceChildren(img);
    };
    img.onerror = function () {
      img.removeAttribute('src');
    };
    img.src = url;
  }

  function renderRow(row) {
    var a = document.createElement('a');
    a.className = 'trending-row';
    a.href = hrefFromPage(row);
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
    var posts = row.post_count || row.message_count || 0;
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
    var onlineLabel =
      t('www.trendingTalking', { count: online }) || online + ' online';
    var postsKey = posts === 1 ? 'www.trendingPost' : 'www.trendingPosts';
    var postsLabel =
      t(postsKey, { count: posts }) ||
      posts + (posts === 1 ? ' post' : ' posts');
    talking.textContent = onlineLabel + ' · ' + postsLabel;
    meta.appendChild(talking);

    body.appendChild(title);
    body.appendChild(host);
    body.appendChild(meta);
    a.appendChild(fav);
    a.appendChild(body);
    return a;
  }

  function renderEmpty(list, message) {
    list.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'trending-empty';
    box.textContent = message || t('www.trendingEmpty') || 'Nothing trending yet.';
    list.appendChild(box);
  }

  function renderRows(list, rows, opts) {
    var append = opts && opts.append;
    if (!append) list.innerHTML = '';
    rows.forEach(function (row) {
      list.appendChild(renderRow(row));
    });
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

  function sendJson(ws, body) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(body));
  }

  /**
   * Live online counts for whatever rooms `getRows` currently lists.
   * REST poll is the fallback if the socket drops.
   */
  function createPresence(getRows, onRows) {
    var pollTimer = null;
    var presenceSocket = null;
    var presenceHeartbeat = null;
    var presenceHbRef = 1;

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

    function refreshOnlineCounts() {
      var cfg = window.EC_SUPABASE;
      var rows = getRows();
      if (!cfg || !cfg.url || !cfg.anonKey || !rows || !rows.length) return;
      var urls = rows
        .map(function (row) {
          return row.canonical_url;
        })
        .filter(Boolean);
      fetchOnlineCounts(cfg, urls)
        .then(function (counts) {
          onRows(mergeOnlineCounts(getRows() || rows, counts));
        })
        .catch(function () {
          /* keep last paint */
        });
    }

    function subscribePresence() {
      var cfg = window.EC_SUPABASE;
      closePresence();
      if (!cfg || !cfg.url || !cfg.anonKey || typeof WebSocket === 'undefined') {
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
        if (presenceSocket !== ws) return;
        var rows = getRows();
        if (!rows || !rows.length) return;
        var msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        var change = changeFromRealtimeMessage(msg);
        if (!change) return;
        var next = applyOnlineCountChange(rows, change);
        if (next === rows) return;
        onRows(next);
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

    function ensurePoll() {
      if (pollTimer) return;
      pollTimer = setInterval(refreshOnlineCounts, 12000);
    }

    function stop() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      closePresence();
    }

    function start() {
      ensurePoll();
      subscribePresence();
    }

    return { start: start, stop: stop, refresh: refreshOnlineCounts };
  }

  /**
   * Escape a user search string for PostgREST `ilike` + `or()`.
   * `*` is the PostgREST wildcard; `%`/`_` are LIKE wildcards.
   */
  function escapeIlike(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/\*/g, '\\*');
  }

  function quoteFilterValue(value) {
    return '"' + String(value).replace(/"/g, '\\"') + '"';
  }

  /**
   * Public rooms with 1+ live comments (`active_pages`). Empty `pages`
   * rows from opening the side panel are excluded. Search title / URL.
   */
  function fetchPages(cfg, opts) {
    var limit = (opts && opts.limit) || 90;
    var offset = (opts && opts.offset) || 0;
    var q = opts && opts.q ? String(opts.q).trim() : '';
    var url = new URL(cfg.url.replace(/\/$/, '') + '/rest/v1/active_pages');
    url.searchParams.set(
      'select',
      'id,canonical_url,url,title,favicon_url,message_count,post_count,last_active_at',
    );
    url.searchParams.set('order', 'last_active_at.desc,id.asc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    if (q) {
      var pattern = quoteFilterValue('*' + escapeIlike(q) + '*');
      url.searchParams.set(
        'or',
        '(title.ilike.' +
          pattern +
          ',canonical_url.ilike.' +
          pattern +
          ',url.ilike.' +
          pattern +
          ')',
      );
    }
    return fetch(url.toString(), { headers: supabaseHeaders(cfg) }).then(
      function (res) {
        if (!res.ok) throw new Error('active_pages ' + res.status);
        return res.json();
      },
    );
  }

  function fetchTrending(cfg, limit) {
    var endpoint =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/trending_pages?select=*&limit=' +
      limit;
    return fetch(endpoint, { headers: supabaseHeaders(cfg) }).then(
      function (res) {
        if (!res.ok) throw new Error('trending ' + res.status);
        return res.json();
      },
    );
  }

  function withOnlineCounts(cfg, rows) {
    var urls = (rows || [])
      .map(function (row) {
        return row.canonical_url;
      })
      .filter(Boolean);
    return fetchOnlineCounts(cfg, urls)
      .then(function (counts) {
        return mergeOnlineCounts(rows, counts);
      })
      .catch(function () {
        return mergeOnlineCounts(rows, []);
      });
  }

  function waitForCatalog(done) {
    var tries = 0;
    function boot() {
      tries += 1;
      if (window.__ecCatalog || tries > 20) {
        done();
        return;
      }
      setTimeout(boot, 50);
    }
    boot();
  }

  global.ECRooms = {
    t: t,
    displayUrl: displayUrl,
    hostFromCanonical: hostFromCanonical,
    hrefFromPage: hrefFromPage,
    renderRow: renderRow,
    renderEmpty: renderEmpty,
    renderRows: renderRows,
    supabaseHeaders: supabaseHeaders,
    fetchOnlineCounts: fetchOnlineCounts,
    mergeOnlineCounts: mergeOnlineCounts,
    applyOnlineCountChange: applyOnlineCountChange,
    createPresence: createPresence,
    fetchPages: fetchPages,
    fetchTrending: fetchTrending,
    withOnlineCounts: withOnlineCounts,
    waitForCatalog: waitForCatalog,
  };
})(window);

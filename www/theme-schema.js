/**
 * Official Everchat skin schema for everch.at.
 * JSON tokens only — never user CSS, url(), or @import.
 */
(function (global) {
  var SCHEMA_VERSION = 1;
  var JSON_MAX_BYTES = 8192;

  var COLOR_TOKENS = [
    '--color-background',
    '--color-foreground',
    '--color-muted',
    '--color-muted-foreground',
    '--color-border',
    '--color-card',
    '--color-primary',
    '--color-primary-foreground',
    '--color-accent',
    '--color-anonymous-avatar',
    '--color-destructive',
    '--color-success',
    '--color-score-pos',
    '--color-score-neg',
    '--color-ring',
    '--color-hover-background',
    '--color-hover-border',
    '--color-hover-foreground',
  ];

  var SIZE_TOKENS = [
    { name: '--radius-sm', min: 0, max: 32, fallback: 6 },
    { name: '--radius-md', min: 0, max: 32, fallback: 8 },
    { name: '--radius-lg', min: 0, max: 32, fallback: 12 },
    { name: '--font-size', min: 10, max: 24, fallback: 14 },
    { name: '--font-size-sm', min: 10, max: 22, fallback: 12 },
    { name: '--font-size-lg', min: 12, max: 28, fallback: 16 },
    { name: '--border-width', min: 0, max: 8, fallback: 1 },
    { name: '--space-pad', min: 0, max: 48, fallback: 12 },
    { name: '--space-margin', min: 0, max: 48, fallback: 8 },
    { name: '--space-composer-pad', min: 0, max: 48, fallback: 12 },
  ];

  var COLOR_SET = {};
  COLOR_TOKENS.forEach(function (n) {
    COLOR_SET[n] = true;
  });
  var SIZE_BY_NAME = {};
  SIZE_TOKENS.forEach(function (t) {
    SIZE_BY_NAME[t.name] = t;
  });
  var TOKEN_NAMES = COLOR_TOKENS.concat(
    SIZE_TOKENS.map(function (t) {
      return t.name;
    }),
  );

  var HEX = /^#([0-9a-fA-F]{6})$/;
  var FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
  var NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,79}$/u;
  var AUTHOR = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,39}$/u;
  var SLUG = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;
  var FORBIDDEN = /url\s*\(|@import|<\/?script|javascript:|data:|expression\s*\(/i;
  var FONT_LINK_ID = 'ec-skin-font';
  var DEFAULT_THEME_SLUG = 'everchat';
  var DEFAULT_THEME_ID = 'e0e0e0e0-0000-4000-8000-000000000001';

  var DEFAULT_TOKENS = {
    '--color-background': '#fafafa',
    '--color-foreground': '#18181b',
    '--color-muted': '#f4f4f5',
    '--color-muted-foreground': '#71717a',
    '--color-border': '#e4e4e7',
    '--color-card': '#ffffff',
    '--color-primary': '#27272a',
    '--color-primary-foreground': '#fafafa',
    '--color-anonymous-avatar': '#e4e4e7',
    '--color-accent': '#f4f4f5',
    '--color-destructive': '#dc2626',
    '--color-success': '#0f766e',
    '--color-score-pos': '#0f766e',
    '--color-score-neg': '#dc2626',
    '--color-ring': '#a1a1aa',
    '--color-hover-background': '#f4f4f5',
    '--color-hover-border': '#d4d4d8',
    '--color-hover-foreground': '#18181b',
    '--radius-sm': 6,
    '--radius-md': 8,
    '--radius-lg': 12,
    '--font-size': 14,
    '--font-size-sm': 12,
    '--font-size-lg': 16,
    '--border-width': 1,
    '--space-pad': 12,
    '--space-margin': 8,
    '--space-composer-pad': 12,
  };

  var FONT_SUGGESTIONS = [
    'Inter',
    'Literata',
    'Source Serif 4',
    'Merriweather',
    'Lora',
    'Source Sans 3',
    'IBM Plex Sans',
    'IBM Plex Serif',
    'DM Sans',
    'Nunito',
    'Libre Baskerville',
    'Newsreader',
    'Fraunces',
    'Atkinson Hyperlegible',
    'Karla',
    'Manrope',
  ];

  function hasForbidden(value) {
    return typeof value === 'string' && FORBIDDEN.test(value);
  }

  function isValidHex(value) {
    return typeof value === 'string' && HEX.test(value);
  }

  function isValidFontFamily(value) {
    if (typeof value !== 'string') return false;
    var family = value.trim();
    if (!family) return true;
    if (hasForbidden(family)) return false;
    return FONT_FAMILY.test(family);
  }

  function sanitizeFontFamily(value) {
    if (typeof value !== 'string') return '';
    var family = value.trim();
    return isValidFontFamily(family) ? family : '';
  }

  function googleFontsHref(family) {
    var safe = sanitizeFontFamily(family);
    if (!safe) return null;
    return (
      'https://fonts.googleapis.com/css2?family=' +
      safe.replace(/ /g, '+') +
      ':ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'
    );
  }

  function googleFontsPreviewHref(families) {
    var list = typeof families === 'string' ? [families] : families || [];
    var safe = [];
    var seen = {};
    var i;
    for (i = 0; i < list.length; i++) {
      var name = sanitizeFontFamily(list[i]);
      if (!name || seen[name]) continue;
      seen[name] = true;
      safe.push(name);
    }
    if (!safe.length) return null;
    return (
      'https://fonts.googleapis.com/css2?' +
      safe
        .map(function (name) {
          return 'family=' + name.replace(/ /g, '+') + ':wght@400';
        })
        .join('&') +
      '&display=swap'
    );
  }

  function loadGoogleFontPreviews(doc, families) {
    var href = googleFontsPreviewHref(families);
    if (!href || !doc || !doc.head) return;
    var existing = doc.querySelectorAll('link[data-ec-font-preview]');
    var i;
    for (i = 0; i < existing.length; i++) {
      if (existing[i].href === href) return;
    }
    var link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.referrerPolicy = 'no-referrer';
    link.setAttribute('data-ec-font-preview', '1');
    doc.head.appendChild(link);
  }

  function validateLabel(value, kind) {
    if (typeof value !== 'string') return null;
    var text = value.trim();
    if (hasForbidden(text)) return null;
    if (kind === 'name' && NAME.test(text)) return text;
    if (kind === 'author' && AUTHOR.test(text)) return text;
    return null;
  }

  function isValidSlug(value) {
    return typeof value === 'string' && SLUG.test(value);
  }

  function validateTokens(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var keys = Object.keys(raw);
    if (keys.length > TOKEN_NAMES.length) return null;
    var i;
    for (i = 0; i < keys.length; i++) {
      if (!COLOR_SET[keys[i]] && !SIZE_BY_NAME[keys[i]]) return null;
      if (hasForbidden(raw[keys[i]])) return null;
    }
    var tokens = {};
    COLOR_TOKENS.forEach(function (name) {
      tokens[name] = DEFAULT_TOKENS[name];
    });
    SIZE_TOKENS.forEach(function (spec) {
      tokens[spec.name] = DEFAULT_TOKENS[spec.name];
    });
    for (i = 0; i < COLOR_TOKENS.length; i++) {
      var cname = COLOR_TOKENS[i];
      var cval = raw[cname];
      if (cval == null) continue;
      if (!isValidHex(cval)) return null;
      tokens[cname] = cval.toLowerCase();
    }
    for (i = 0; i < SIZE_TOKENS.length; i++) {
      var spec = SIZE_TOKENS[i];
      var sval = raw[spec.name];
      if (sval == null) continue;
      if (typeof sval !== 'number' || !isFinite(sval)) return null;
      if (sval < spec.min || sval > spec.max) return null;
      tokens[spec.name] = Math.round(sval);
    }
    return tokens;
  }

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  function validateTheme(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (hasForbidden(JSON.stringify(raw))) return null;
    if (raw.schemaVersion !== SCHEMA_VERSION) return null;
    if ('css' in raw || 'style' in raw || 'url' in raw) return null;
    var name = validateLabel(raw.name, 'name');
    var author = validateLabel(raw.author, 'author');
    if (!name || !author) return null;
    if (!isValidFontFamily(raw.fontFamily)) return null;
    var tokens = validateTokens(raw.tokens);
    if (!tokens) return null;
    var doc = {
      schemaVersion: SCHEMA_VERSION,
      name: name,
      author: author,
      fontFamily: sanitizeFontFamily(raw.fontFamily),
      tokens: tokens,
    };
    if (byteLength(JSON.stringify(doc)) > JSON_MAX_BYTES) return null;
    return doc;
  }

  function isDefaultThemeSlug(value) {
    return value === DEFAULT_THEME_SLUG;
  }

  function defaultTheme() {
    return {
      schemaVersion: SCHEMA_VERSION,
      name: 'Default',
      author: 'Everchat',
      fontFamily: '',
      tokens: Object.assign({}, DEFAULT_TOKENS),
    };
  }

  function defaultThemeRow() {
    var theme = defaultTheme();
    return {
      id: DEFAULT_THEME_ID,
      slug: DEFAULT_THEME_SLUG,
      name: theme.name,
      author_name: theme.author,
      font_family: theme.fontFamily,
      tokens: theme.tokens,
      created_at: '2020-01-01T00:00:00.000Z',
      like_count: 0,
    };
  }

  function withDefaultTheme(rows) {
    var found = null;
    var others = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      if (row.slug === DEFAULT_THEME_SLUG) found = row;
      else others.push(row);
    });
    var def = defaultThemeRow();
    if (found) {
      def.id = found.id || def.id;
      def.like_count =
        typeof found.like_count === 'number' ? found.like_count : 0;
      if (found.created_at) def.created_at = found.created_at;
    }
    return [def].concat(others);
  }

  function sortThemes(rows, mode) {
    var list = (rows || []).slice();
    if (mode === 'best') {
      list.sort(function (a, b) {
        var la = typeof a.like_count === 'number' ? a.like_count : 0;
        var lb = typeof b.like_count === 'number' ? b.like_count : 0;
        if (lb !== la) return lb - la;
        var ta = Date.parse(a.created_at || '') || 0;
        var tb = Date.parse(b.created_at || '') || 0;
        return tb - ta;
      });
      return list;
    }
    var def = [];
    var rest = [];
    list.forEach(function (row) {
      if (row && row.slug === DEFAULT_THEME_SLUG) def.push(row);
      else rest.push(row);
    });
    rest.sort(function (a, b) {
      var ta = Date.parse(a.created_at || '') || 0;
      var tb = Date.parse(b.created_at || '') || 0;
      return tb - ta;
    });
    return def.concat(rest);
  }

  function exportTheme(theme) {
    return {
      schemaVersion: SCHEMA_VERSION,
      name: theme.name,
      author: theme.author,
      fontFamily: theme.fontFamily,
      tokens: Object.assign({}, theme.tokens),
    };
  }

  function loadGoogleFont(doc, family) {
    var href = googleFontsHref(family);
    var existing = doc.getElementById(FONT_LINK_ID);
    if (!href) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.tagName === 'LINK' && existing.href === href) {
      return;
    }
    if (existing) existing.remove();
    var link = doc.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    link.referrerPolicy = 'no-referrer';
    doc.head.appendChild(link);
  }

  function applyThemeVars(el, theme) {
    TOKEN_NAMES.forEach(function (name) {
      el.style.removeProperty(name);
    });
    el.style.removeProperty('--font-sans');
    el.removeAttribute('data-ec-skin');
    if (!theme) return;
    el.setAttribute('data-ec-skin', theme.name);
    COLOR_TOKENS.forEach(function (name) {
      el.style.setProperty(name, theme.tokens[name]);
    });
    SIZE_TOKENS.forEach(function (spec) {
      el.style.setProperty(spec.name, theme.tokens[spec.name] + 'px');
    });
    var family = sanitizeFontFamily(theme.fontFamily);
    if (family) {
      el.style.setProperty(
        '--font-sans',
        '"' + family + '", ui-sans-serif, system-ui, sans-serif',
      );
    }
  }

  function applyTheme(el, theme, doc) {
    applyThemeVars(el, theme);
    loadGoogleFont(doc || document, theme ? theme.fontFamily : '');
  }

  function swatchColors(tokens) {
    if (!tokens) return [];
    return [
      tokens['--color-background'],
      tokens['--color-foreground'],
      tokens['--color-primary'],
      tokens['--color-accent'],
      tokens['--color-border'],
    ].filter(isValidHex);
  }

  function supabaseHeaders(cfg) {
    return {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.anonKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  function normalizeThemeRow(row) {
    if (!row) return row;
    if (typeof row.like_count !== 'number') row.like_count = 0;
    return row;
  }

  function fetchThemes(cfg) {
    var root = cfg.url.replace(/\/$/, '') + '/rest/v1/themes?';
    var headers = supabaseHeaders(cfg);
    var full =
      root +
      'select=id,slug,name,author_name,font_family,tokens,created_at,like_count&order=created_at.desc';
    var lite =
      root +
      'select=id,slug,name,author_name,font_family,tokens,created_at&order=created_at.desc';
    return fetch(full, { headers: headers }).then(function (res) {
      if (res.ok) {
        return res.json().then(function (rows) {
          return (rows || []).map(normalizeThemeRow);
        });
      }
      return fetch(lite, { headers: headers }).then(function (retry) {
        if (!retry.ok) throw new Error('themes ' + retry.status);
        return retry.json().then(function (rows) {
          return (rows || []).map(normalizeThemeRow);
        });
      });
    });
  }

  function fetchTheme(cfg, slug) {
    if (!isValidSlug(slug)) return Promise.reject(new Error('slug'));
    if (isDefaultThemeSlug(slug) && (!cfg || !cfg.url)) {
      return Promise.resolve(defaultThemeRow());
    }
    var root = cfg.url.replace(/\/$/, '') + '/rest/v1/themes?slug=eq.';
    var headers = supabaseHeaders(cfg);
    var suffix =
      encodeURIComponent(slug) +
      '&select=id,slug,name,author_name,font_family,tokens,created_at,like_count&limit=1';
    var liteSuffix =
      encodeURIComponent(slug) +
      '&select=id,slug,name,author_name,font_family,tokens,created_at&limit=1';
    return fetch(root + suffix, { headers: headers })
      .then(function (res) {
        if (res.ok) {
          return res.json().then(function (rows) {
            return rows && rows[0] ? normalizeThemeRow(rows[0]) : null;
          });
        }
        return fetch(root + liteSuffix, { headers: headers }).then(function (
          retry,
        ) {
          if (!retry.ok) throw new Error('theme ' + retry.status);
          return retry.json().then(function (rows) {
            return rows && rows[0] ? normalizeThemeRow(rows[0]) : null;
          });
        });
      })
      .then(function (row) {
        if (row) return row;
        if (isDefaultThemeSlug(slug)) return defaultThemeRow();
        return null;
      });
  }

  function likeThemeUrl(cfg) {
    return cfg.url.replace(/\/$/, '') + '/functions/v1/like-theme';
  }

  function fetchMyThemeLikes(cfg) {
    if (!cfg || !cfg.url || !cfg.anonKey) return Promise.resolve([]);
    return fetch(likeThemeUrl(cfg), {
      headers: supabaseHeaders(cfg),
    }).then(function (res) {
      if (!res.ok) return [];
      return res.json().then(function (data) {
        return data && Array.isArray(data.liked) ? data.liked : [];
      });
    });
  }

  function toggleThemeLike(cfg, slug) {
    if (!isValidSlug(slug)) return Promise.reject(new Error('slug'));
    return fetch(likeThemeUrl(cfg), {
      method: 'POST',
      headers: supabaseHeaders(cfg),
      body: JSON.stringify({ slug: slug }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || 'like');
          err.code = data && data.code;
          throw err;
        }
        return data;
      });
    });
  }

  function rowToTheme(row) {
    if (!row) return null;
    return validateTheme({
      schemaVersion: SCHEMA_VERSION,
      name: row.name,
      author: row.author_name,
      fontFamily: row.font_family || '',
      tokens: row.tokens,
    });
  }

  function publishTheme(cfg, theme) {
    var valid = validateTheme(theme);
    if (!valid) return Promise.reject(new Error('invalid'));
    var url = cfg.url.replace(/\/$/, '') + '/functions/v1/publish-theme';
    return fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(cfg),
      body: JSON.stringify(valid),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || 'publish');
          err.code = data && data.code;
          throw err;
        }
        return data;
      });
    });
  }

  var EXTENSION_IDS = [
    'hnafijpegchmgpmkefjihhfpegonnjdb',
    'apoahddgobmmgdbjcphhelolagklgkil',
    'mnncloenhbfhdiaffjmmgljfjcagigaj',
  ];

  function importToExtension(slug) {
    return new Promise(function (resolve) {
      if (!isValidSlug(slug)) {
        resolve({ ok: false, reason: 'slug' });
        return;
      }
      var send = global.chrome && chrome.runtime && chrome.runtime.sendMessage;
      if (typeof send !== 'function') {
        resolve({ ok: false, reason: 'missing' });
        return;
      }
      var settled = false;
      var pending = EXTENSION_IDS.length;
      var timer = setTimeout(function () {
        finish({ ok: false, reason: 'missing' });
      }, 1200);

      function finish(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }

      function oneFailed() {
        pending -= 1;
        if (pending <= 0) finish({ ok: false, reason: 'missing' });
      }

      EXTENSION_IDS.forEach(function (id) {
        try {
          chrome.runtime.sendMessage(
            id,
            { type: 'IMPORT_THEME', slug: slug },
            function (res) {
              if (chrome.runtime.lastError) {
                oneFailed();
                return;
              }
              if (res && res.ok) finish({ ok: true });
              else oneFailed();
            },
          );
        } catch (e) {
          oneFailed();
        }
      });
    });
  }

  function t(key, vars) {
    var catalog = global.__ecCatalog || {};
    var template = catalog[key];
    if (template == null) return key;
    if (!vars) return String(template);
    return String(template).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars[k] == null ? '' : String(vars[k]);
    });
  }

  function postPreviewTheme(frame, theme) {
    if (!frame || !frame.contentWindow || !theme) return;
    var valid = validateTheme(theme);
    if (!valid) return;
    try {
      frame.contentWindow.postMessage(
        { type: 'EC_PREVIEW_THEME', theme: exportTheme(valid) },
        window.location.origin,
      );
    } catch (e) {
      /* ignore */
    }
  }

  function bindPreviewFrame(frame, getTheme) {
    if (!frame || typeof getTheme !== 'function') return;
    function send() {
      postPreviewTheme(frame, getTheme());
    }
    frame.addEventListener('load', send);
    window.addEventListener('message', function (event) {
      if (event.source !== frame.contentWindow) return;
      if (!event.data || event.data.type !== 'EC_PREVIEW_READY') return;
      send();
    });
    if (frame.contentWindow) send();
    return send;
  }

  function waitForCatalog(done) {
    var tries = 0;
    function boot() {
      tries += 1;
      if (global.__ecCatalog || tries > 40) {
        done();
        return;
      }
      setTimeout(boot, 50);
    }
    boot();
  }

  global.ECTheme = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    COLOR_TOKENS: COLOR_TOKENS,
    SIZE_TOKENS: SIZE_TOKENS,
    TOKEN_NAMES: TOKEN_NAMES,
    DEFAULT_TOKENS: DEFAULT_TOKENS,
    DEFAULT_THEME_SLUG: DEFAULT_THEME_SLUG,
    DEFAULT_THEME_ID: DEFAULT_THEME_ID,
    FONT_SUGGESTIONS: FONT_SUGGESTIONS,
    isValidHex: isValidHex,
    isValidFontFamily: isValidFontFamily,
    sanitizeFontFamily: sanitizeFontFamily,
    googleFontsHref: googleFontsHref,
    googleFontsPreviewHref: googleFontsPreviewHref,
    loadGoogleFontPreviews: loadGoogleFontPreviews,
    validateLabel: validateLabel,
    isValidSlug: isValidSlug,
    isDefaultThemeSlug: isDefaultThemeSlug,
    validateTokens: validateTokens,
    validateTheme: validateTheme,
    defaultTheme: defaultTheme,
    defaultThemeRow: defaultThemeRow,
    withDefaultTheme: withDefaultTheme,
    sortThemes: sortThemes,
    exportTheme: exportTheme,
    applyTheme: applyTheme,
    applyThemeVars: applyThemeVars,
    loadGoogleFont: loadGoogleFont,
    swatchColors: swatchColors,
    fetchThemes: fetchThemes,
    fetchTheme: fetchTheme,
    fetchMyThemeLikes: fetchMyThemeLikes,
    toggleThemeLike: toggleThemeLike,
    rowToTheme: rowToTheme,
    publishTheme: publishTheme,
    importToExtension: importToExtension,
    t: t,
    waitForCatalog: waitForCatalog,
    postPreviewTheme: postPreviewTheme,
    bindPreviewFrame: bindPreviewFrame,
  };
})(typeof window !== 'undefined' ? window : globalThis);

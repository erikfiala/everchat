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

  function defaultTheme() {
    return {
      schemaVersion: SCHEMA_VERSION,
      name: 'Zinc',
      author: 'Everchat',
      fontFamily: '',
      tokens: Object.assign({}, DEFAULT_TOKENS),
    };
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

  function fetchThemes(cfg) {
    var url =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/themes?select=id,slug,name,author_name,font_family,tokens,created_at&order=created_at.desc';
    return fetch(url, { headers: supabaseHeaders(cfg) }).then(function (res) {
      if (!res.ok) throw new Error('themes ' + res.status);
      return res.json();
    });
  }

  function fetchTheme(cfg, slug) {
    if (!isValidSlug(slug)) return Promise.reject(new Error('slug'));
    var url =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/themes?slug=eq.' +
      encodeURIComponent(slug) +
      '&select=id,slug,name,author_name,font_family,tokens,created_at&limit=1';
    return fetch(url, { headers: supabaseHeaders(cfg) }).then(function (res) {
      if (!res.ok) throw new Error('theme ' + res.status);
      return res.json().then(function (rows) {
        return rows && rows[0] ? rows[0] : null;
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
    FONT_SUGGESTIONS: FONT_SUGGESTIONS,
    isValidHex: isValidHex,
    isValidFontFamily: isValidFontFamily,
    sanitizeFontFamily: sanitizeFontFamily,
    googleFontsHref: googleFontsHref,
    googleFontsPreviewHref: googleFontsPreviewHref,
    loadGoogleFontPreviews: loadGoogleFontPreviews,
    validateLabel: validateLabel,
    isValidSlug: isValidSlug,
    validateTokens: validateTokens,
    validateTheme: validateTheme,
    defaultTheme: defaultTheme,
    exportTheme: exportTheme,
    applyTheme: applyTheme,
    applyThemeVars: applyThemeVars,
    loadGoogleFont: loadGoogleFont,
    swatchColors: swatchColors,
    fetchThemes: fetchThemes,
    fetchTheme: fetchTheme,
    rowToTheme: rowToTheme,
    publishTheme: publishTheme,
    importToExtension: importToExtension,
    t: t,
    waitForCatalog: waitForCatalog,
    postPreviewTheme: postPreviewTheme,
    bindPreviewFrame: bindPreviewFrame,
  };
})(typeof window !== 'undefined' ? window : globalThis);

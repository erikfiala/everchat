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
  var DEFAULT_ICON_PACK = 'lu';
  var ICON_PACK_IDS = ['lu', 'fi', 'hi2', 'tb', 'pi'];
  var ICON_PACK_SET = {};
  ICON_PACK_IDS.forEach(function (id) {
    ICON_PACK_SET[id] = true;
  });

  var DEFAULT_LIGHT_COLORS = {
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
  };

  var DEFAULT_DARK_COLORS = {
    '--color-background': '#18181b',
    '--color-foreground': '#fafafa',
    '--color-muted': '#27272a',
    '--color-muted-foreground': '#a1a1aa',
    '--color-border': '#3f3f46',
    '--color-card': '#27272a',
    '--color-primary': '#f4f4f5',
    '--color-primary-foreground': '#18181b',
    '--color-accent': '#3f3f46',
    '--color-anonymous-avatar': '#71717a',
    '--color-destructive': '#f87171',
    '--color-success': '#2dd4bf',
    '--color-score-pos': '#2dd4bf',
    '--color-score-neg': '#f87171',
    '--color-ring': '#71717a',
    '--color-hover-background': '#3f3f46',
    '--color-hover-border': '#52525b',
    '--color-hover-foreground': '#fafafa',
  };

  var DEFAULT_SIZE_VALUES = {
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

  var DEFAULT_TOKENS = {
    light: Object.assign({}, DEFAULT_LIGHT_COLORS),
    dark: Object.assign({}, DEFAULT_DARK_COLORS),
  };
  Object.keys(DEFAULT_SIZE_VALUES).forEach(function (name) {
    DEFAULT_TOKENS[name] = DEFAULT_SIZE_VALUES[name];
  });

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

  function isValidIconPack(value) {
    return typeof value === 'string' && ICON_PACK_SET[value];
  }

  function sanitizeIconPack(value) {
    return isValidIconPack(value) ? value : DEFAULT_ICON_PACK;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clonePalette(palette) {
    var out = {};
    COLOR_TOKENS.forEach(function (name) {
      out[name] = palette[name];
    });
    return out;
  }

  function cloneTokens(tokens) {
    var out = {
      light: clonePalette(tokens.light),
      dark: clonePalette(tokens.dark),
    };
    SIZE_TOKENS.forEach(function (spec) {
      out[spec.name] = tokens[spec.name];
    });
    return out;
  }

  function validateColorPalette(raw, fallback) {
    if (!isPlainObject(raw)) return null;
    var keys = Object.keys(raw);
    if (keys.length > COLOR_TOKENS.length) return null;
    var palette = clonePalette(fallback);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (!COLOR_SET[keys[i]]) return null;
      if (hasForbidden(raw[keys[i]])) return null;
      var value = raw[keys[i]];
      if (value == null) continue;
      if (!isValidHex(value)) return null;
      palette[keys[i]] = value.toLowerCase();
    }
    return palette;
  }

  function validateSizeValues(raw) {
    var sizes = {};
    SIZE_TOKENS.forEach(function (spec) {
      sizes[spec.name] = DEFAULT_SIZE_VALUES[spec.name];
    });
    var i;
    for (i = 0; i < SIZE_TOKENS.length; i++) {
      var spec = SIZE_TOKENS[i];
      var sval = raw[spec.name];
      if (sval == null) continue;
      if (typeof sval !== 'number' || !isFinite(sval)) return null;
      if (sval < spec.min || sval > spec.max) return null;
      sizes[spec.name] = Math.round(sval);
    }
    return sizes;
  }

  function validateTokens(raw) {
    if (!isPlainObject(raw)) return null;
    var keys = Object.keys(raw);
    var i;
    if (isPlainObject(raw.light) || isPlainObject(raw.dark)) {
      if (keys.length > 2 + SIZE_TOKENS.length) return null;
      for (i = 0; i < keys.length; i++) {
        if (keys[i] === 'light' || keys[i] === 'dark') continue;
        if (!SIZE_BY_NAME[keys[i]]) return null;
        if (hasForbidden(raw[keys[i]])) return null;
      }
      if (!isPlainObject(raw.light) || !isPlainObject(raw.dark)) return null;
      var light = validateColorPalette(raw.light, DEFAULT_LIGHT_COLORS);
      var dark = validateColorPalette(raw.dark, DEFAULT_DARK_COLORS);
      var dualSizes = validateSizeValues(raw);
      if (!light || !dark || !dualSizes) return null;
      return Object.assign({ light: light, dark: dark }, dualSizes);
    }
    if (keys.length > TOKEN_NAMES.length) return null;
    for (i = 0; i < keys.length; i++) {
      if (!COLOR_SET[keys[i]] && !SIZE_BY_NAME[keys[i]]) return null;
      if (hasForbidden(raw[keys[i]])) return null;
    }
    var palette = clonePalette(DEFAULT_LIGHT_COLORS);
    for (i = 0; i < COLOR_TOKENS.length; i++) {
      var cname = COLOR_TOKENS[i];
      var cval = raw[cname];
      if (cval == null) continue;
      if (!isValidHex(cval)) return null;
      palette[cname] = cval.toLowerCase();
    }
    var sizes = validateSizeValues(raw);
    if (!sizes) return null;
    return Object.assign(
      { light: clonePalette(palette), dark: clonePalette(palette) },
      sizes,
    );
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
    if (raw.iconPack != null && !isValidIconPack(raw.iconPack)) return null;
    var tokens = validateTokens(raw.tokens);
    if (!tokens) return null;
    var doc = {
      schemaVersion: SCHEMA_VERSION,
      name: name,
      author: author,
      fontFamily: sanitizeFontFamily(raw.fontFamily),
      iconPack: sanitizeIconPack(raw.iconPack),
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
      iconPack: DEFAULT_ICON_PACK,
      tokens: cloneTokens(DEFAULT_TOKENS),
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
      icon_pack: theme.iconPack,
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
    var def = [];
    var rest = [];
    list.forEach(function (row) {
      if (row && isDefaultThemeSlug(row.slug)) def.push(row);
      else rest.push(row);
    });
    if (mode === 'best') {
      rest.sort(function (a, b) {
        var la = typeof a.like_count === 'number' ? a.like_count : 0;
        var lb = typeof b.like_count === 'number' ? b.like_count : 0;
        if (lb !== la) return lb - la;
        var ta = Date.parse(a.created_at || '') || 0;
        var tb = Date.parse(b.created_at || '') || 0;
        return tb - ta;
      });
    } else {
      rest.sort(function (a, b) {
        var ta = Date.parse(a.created_at || '') || 0;
        var tb = Date.parse(b.created_at || '') || 0;
        return tb - ta;
      });
    }
    return def.concat(rest);
  }

  function exportTheme(theme) {
    return {
      schemaVersion: SCHEMA_VERSION,
      name: theme.name,
      author: theme.author,
      fontFamily: theme.fontFamily,
      iconPack: sanitizeIconPack(theme.iconPack),
      tokens: cloneTokens(theme.tokens),
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

  function resolveThemeAppearance(doc) {
    var root = (doc || document).documentElement;
    return root && root.dataset && root.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function applyThemeVars(el, theme, appearance) {
    TOKEN_NAMES.forEach(function (name) {
      el.style.removeProperty(name);
    });
    el.style.removeProperty('--font-sans');
    el.removeAttribute('data-ec-skin');
    el.removeAttribute('data-ec-icon-pack');
    if (!theme) return;
    var mode = appearance || resolveThemeAppearance(el.ownerDocument || document);
    var colors =
      theme.tokens[mode] || theme.tokens.light || theme.tokens;
    el.setAttribute('data-ec-skin', theme.name);
    el.setAttribute('data-ec-icon-pack', sanitizeIconPack(theme.iconPack));
    COLOR_TOKENS.forEach(function (name) {
      if (colors[name]) el.style.setProperty(name, colors[name]);
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

  function applyTheme(el, theme, doc, appearance) {
    applyThemeVars(el, theme, appearance);
    loadGoogleFont(doc || document, theme ? theme.fontFamily : '');
  }

  function swatchColors(tokens) {
    if (!tokens) return [];
    var palette = tokens.light || tokens;
    return [
      palette['--color-background'],
      palette['--color-foreground'],
      palette['--color-primary'],
      palette['--color-accent'],
      palette['--color-border'],
    ].filter(isValidHex);
  }

  function supabaseHeaders(cfg, token) {
    return {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + (token || cfg.anonKey),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  function formatThemeAuthor(name) {
    var raw = typeof name === 'string' ? name.trim() : '';
    if (!raw) return '';
    if (/^everchat$/i.test(raw)) return raw;
    if (raw.charAt(0) === '@') return raw;
    return '@' + raw;
  }

  function normalizeThemeRow(row) {
    if (!row) return row;
    if (typeof row.like_count !== 'number') row.like_count = 0;
    return row;
  }

  function fetchThemeSelects(orderSuffix) {
    return [
      'id,slug,name,author_name,font_family,icon_pack,tokens,created_at,like_count' +
        orderSuffix,
      'id,slug,name,author_name,font_family,tokens,created_at,like_count' +
        orderSuffix,
      'id,slug,name,author_name,font_family,icon_pack,tokens,created_at' +
        orderSuffix,
      'id,slug,name,author_name,font_family,tokens,created_at' + orderSuffix,
    ];
  }

  function fetchFirstOk(urls, headers) {
    function next(i) {
      if (i >= urls.length) return Promise.reject(new Error('themes'));
      return fetch(urls[i], { headers: headers }).then(function (res) {
        if (res.ok) return res.json();
        return next(i + 1);
      });
    }
    return next(0);
  }

  function fetchThemes(cfg) {
    var root = cfg.url.replace(/\/$/, '') + '/rest/v1/themes?select=';
    var headers = supabaseHeaders(cfg);
    var urls = fetchThemeSelects('&order=created_at.desc').map(function (sel) {
      return root + sel;
    });
    return fetchFirstOk(urls, headers).then(function (rows) {
      return (rows || []).map(normalizeThemeRow);
    });
  }

  function fetchTheme(cfg, slug) {
    if (!isValidSlug(slug)) return Promise.reject(new Error('slug'));
    if (isDefaultThemeSlug(slug) && (!cfg || !cfg.url)) {
      return Promise.resolve(defaultThemeRow());
    }
    var root =
      cfg.url.replace(/\/$/, '') +
      '/rest/v1/themes?slug=eq.' +
      encodeURIComponent(slug) +
      '&select=';
    var headers = supabaseHeaders(cfg);
    var urls = fetchThemeSelects('&limit=1').map(function (sel) {
      return root + sel;
    });
    return fetchFirstOk(urls, headers)
      .then(function (rows) {
        return rows && rows[0] ? normalizeThemeRow(rows[0]) : null;
      })
      .catch(function () {
        throw new Error('theme');
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
      iconPack: row.icon_pack || DEFAULT_ICON_PACK,
      tokens: row.tokens,
    });
  }

  function publishTheme(cfg, theme, token) {
    var valid = validateTheme(theme);
    if (!valid) return Promise.reject(new Error('invalid'));
    if (!token) {
      var authErr = new Error('auth');
      authErr.code = 'auth';
      return Promise.reject(authErr);
    }
    var url = cfg.url.replace(/\/$/, '') + '/functions/v1/publish-theme';
    return fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(cfg, token),
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

  function pingExtension(message) {
    return new Promise(function (resolve) {
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
          chrome.runtime.sendMessage(id, message, function (res) {
            if (chrome.runtime.lastError) {
              oneFailed();
              return;
            }
            if (res && res.ok) finish(res);
            else oneFailed();
          });
        } catch (e) {
          oneFailed();
        }
      });
    });
  }

  function importToExtension(slug) {
    if (!isValidSlug(slug)) {
      return Promise.resolve({ ok: false, reason: 'slug' });
    }
    return pingExtension({ type: 'IMPORT_THEME', slug: slug }).then(function (res) {
      if (res && res.ok) return { ok: true };
      return { ok: false, reason: (res && res.reason) || 'missing' };
    });
  }

  function requestSession() {
    return pingExtension({ type: 'GET_SESSION' }).then(function (res) {
      if (res && res.ok && res.signedIn && res.token) {
        return {
          ok: true,
          signedIn: true,
          token: res.token,
          username: typeof res.username === 'string' ? res.username : '',
        };
      }
      if (res && res.ok) {
        return { ok: true, signedIn: false, reason: 'unsigned' };
      }
      return { ok: false, reason: 'missing' };
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

  function postPreviewTheme(frame, theme, appearance) {
    if (!frame || !frame.contentWindow || !theme) return;
    var valid = validateTheme(theme);
    if (!valid) return;
    var mode = appearance === 'dark' ? 'dark' : 'light';
    try {
      frame.contentWindow.postMessage(
        {
          type: 'EC_PREVIEW_THEME',
          theme: exportTheme(valid),
          appearance: mode,
        },
        window.location.origin,
      );
    } catch (e) {
      /* ignore */
    }
  }

  function bindPreviewFrame(frame, getTheme) {
    if (!frame || typeof getTheme !== 'function') return;
    function send() {
      var payload = getTheme();
      if (payload && payload.theme) {
        postPreviewTheme(frame, payload.theme, payload.appearance);
        return;
      }
      postPreviewTheme(frame, payload);
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
    DEFAULT_LIGHT_COLORS: DEFAULT_LIGHT_COLORS,
    DEFAULT_DARK_COLORS: DEFAULT_DARK_COLORS,
    DEFAULT_SIZE_VALUES: DEFAULT_SIZE_VALUES,
    DEFAULT_ICON_PACK: DEFAULT_ICON_PACK,
    ICON_PACK_IDS: ICON_PACK_IDS,
    DEFAULT_THEME_SLUG: DEFAULT_THEME_SLUG,
    DEFAULT_THEME_ID: DEFAULT_THEME_ID,
    FONT_SUGGESTIONS: FONT_SUGGESTIONS,
    isValidHex: isValidHex,
    isValidIconPack: isValidIconPack,
    sanitizeIconPack: sanitizeIconPack,
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
    resolveThemeAppearance: resolveThemeAppearance,
    loadGoogleFont: loadGoogleFont,
    swatchColors: swatchColors,
    fetchThemes: fetchThemes,
    fetchTheme: fetchTheme,
    fetchMyThemeLikes: fetchMyThemeLikes,
    toggleThemeLike: toggleThemeLike,
    rowToTheme: rowToTheme,
    publishTheme: publishTheme,
    formatThemeAuthor: formatThemeAuthor,
    requestSession: requestSession,
    importToExtension: importToExtension,
    t: t,
    waitForCatalog: waitForCatalog,
    postPreviewTheme: postPreviewTheme,
    bindPreviewFrame: bindPreviewFrame,
  };
})(typeof window !== 'undefined' ? window : globalThis);

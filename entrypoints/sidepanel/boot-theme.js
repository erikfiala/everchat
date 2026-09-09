/**
 * Early theme boot for sidepanel (FOUC-safe).
 * Preference key: ec-theme. Optional skin JSON: ec-skin (validated tokens only).
 */
(function () {
  var COLOR = {
    '--color-background': 1,
    '--color-foreground': 1,
    '--color-muted': 1,
    '--color-muted-foreground': 1,
    '--color-border': 1,
    '--color-card': 1,
    '--color-primary': 1,
    '--color-primary-foreground': 1,
    '--color-accent': 1,
    '--color-anonymous-avatar': 1,
    '--color-success': 1,
    '--color-destructive': 1,
    '--color-score-pos': 1,
    '--color-score-neg': 1,
    '--color-ring': 1,
    '--color-hover-background': 1,
    '--color-hover-border': 1,
    '--color-hover-foreground': 1,
  };
  var SIZE = {
    '--radius-sm': [0, 32],
    '--radius-md': [0, 32],
    '--radius-lg': [0, 32],
    '--font-size': [10, 24],
    '--font-size-sm': [10, 22],
    '--font-size-lg': [12, 28],
    '--border-width': [0, 8],
    '--space-pad': [0, 48],
    '--space-margin': [0, 48],
    '--space-composer-pad': [0, 48],
  };
  var HEX = /^#([0-9a-fA-F]{6})$/;
  var FONT = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
  var BAD = /url\s*\(|@import|<\/?script|javascript:/i;

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function paletteFor(tokens, appearance) {
    if (!isObject(tokens)) return tokens;
    if (isObject(tokens[appearance])) return tokens[appearance];
    if (isObject(tokens.light)) return tokens.light;
    return tokens;
  }

  function applySkinCss(css) {
    try {
      if (typeof CSSStyleSheet === 'function' && document.adoptedStyleSheets) {
        var sheet = document.__ecSkinSheet;
        if (!sheet) {
          sheet = new CSSStyleSheet();
          document.__ecSkinSheet = sheet;
          document.adoptedStyleSheets = document.adoptedStyleSheets.concat(
            sheet,
          );
        }
        sheet.replaceSync(css);
        return;
      }
    } catch (_) {}
    var style = document.getElementById('ec-skin-vars');
    if (!css) {
      if (style) style.parentNode.removeChild(style);
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = 'ec-skin-vars';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function applySkin(raw, appearance) {
    var root = document.documentElement;
    if (!raw || typeof raw !== 'object' || !raw.tokens) return;
    var tokens = raw.tokens;
    var colors = paletteFor(tokens, appearance);
    var name;
    var decls = [];
    for (name in COLOR) {
      if (!Object.prototype.hasOwnProperty.call(colors, name)) continue;
      var hex = colors[name];
      if (typeof hex === 'string' && HEX.test(hex) && !BAD.test(hex)) {
        decls.push(name + ':' + hex.toLowerCase());
      }
    }
    for (name in SIZE) {
      if (!Object.prototype.hasOwnProperty.call(tokens, name)) continue;
      var n = tokens[name];
      if (typeof n !== 'number' || !isFinite(n)) continue;
      if (n < SIZE[name][0] || n > SIZE[name][1]) continue;
      decls.push(name + ':' + Math.round(n) + 'px');
    }
    var font = tokens['--font-size'];
    var fontSm = tokens['--font-size-sm'];
    var fontLg = tokens['--font-size-lg'];
    if (typeof font === 'number' && isFinite(font)) {
      decls.push('--text-base:' + Math.round(font) + 'px');
      decls.push('--text-sm:' + Math.round(font) + 'px');
    }
    if (typeof fontSm === 'number' && isFinite(fontSm)) {
      decls.push('--text-xs:' + Math.round(fontSm) + 'px');
    }
    if (typeof fontLg === 'number' && isFinite(fontLg)) {
      decls.push('--text-lg:' + Math.round(fontLg) + 'px');
    }
    var family = typeof raw.fontFamily === 'string' ? raw.fontFamily.trim() : '';
    if (family && FONT.test(family) && !BAD.test(family)) {
      decls.push(
        '--font-sans:"' + family + '", ui-sans-serif, system-ui, sans-serif',
      );
      var href =
        'https://fonts.googleapis.com/css2?family=' +
        family.replace(/ /g, '+') +
        ':ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
      var link = document.getElementById('ec-skin-font');
      if (!link) {
        link = document.createElement('link');
        link.id = 'ec-skin-font';
        link.rel = 'stylesheet';
        link.referrerPolicy = 'no-referrer';
        document.head.appendChild(link);
      }
      link.href = href;
    }
    root.removeAttribute('style');
    applySkinCss(decls.length ? ':root{' + decls.join(';') + '}' : '');
    root.setAttribute('data-ec-skin', '1');
    if (typeof raw.iconPack === 'string' && raw.iconPack.length <= 8) {
      root.setAttribute('data-ec-icon-pack', raw.iconPack);
    }
  }

  var resolved = 'light';
  try {
    var raw = localStorage.getItem('ec-theme');
    var pref =
      raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
    resolved =
      pref === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : pref;
    document.documentElement.dataset.theme = resolved;
  } catch (_) {}

  try {
    var skinRaw = localStorage.getItem('ec-skin');
    if (skinRaw) applySkin(JSON.parse(skinRaw), resolved);
  } catch (_) {}

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('ec-skin', function (res) {
        if (res && res['ec-skin']) applySkin(res['ec-skin'], resolved);
      });
    }
  } catch (_) {}
})();

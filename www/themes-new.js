/**
 * Live theme builder at /themes/new. Draft in localStorage; publish via Edge Function.
 */
(function () {
  var DRAFT_KEY = 'ec-theme-draft';
  var COLOR_LABELS = {
    '--color-background': 'www.themeTokenBackground',
    '--color-foreground': 'www.themeTokenForeground',
    '--color-muted': 'www.themeTokenMuted',
    '--color-muted-foreground': 'www.themeTokenMutedFg',
    '--color-border': 'www.themeTokenBorder',
    '--color-card': 'www.themeTokenCard',
    '--color-primary': 'www.themeTokenPrimary',
    '--color-primary-foreground': 'www.themeTokenPrimaryFg',
    '--color-accent': 'www.themeTokenAccent',
    '--color-anonymous-avatar': 'www.themeTokenAvatar',
    '--color-destructive': 'www.themeTokenDestructive',
    '--color-success': 'www.themeTokenSuccess',
    '--color-score-pos': 'www.themeTokenScorePos',
    '--color-score-neg': 'www.themeTokenScoreNeg',
    '--color-ring': 'www.themeTokenRing',
    '--color-hover-background': 'www.themeTokenHoverBg',
    '--color-hover-border': 'www.themeTokenHoverBorder',
    '--color-hover-foreground': 'www.themeTokenHoverFg',
  };
  var SIZE_LABELS = {
    '--radius-sm': 'www.themeTokenRadiusSm',
    '--radius-md': 'www.themeTokenRadiusMd',
    '--radius-lg': 'www.themeTokenRadiusLg',
    '--font-size': 'www.themeTokenFontSize',
    '--font-size-sm': 'www.themeTokenFontSizeSm',
    '--font-size-lg': 'www.themeTokenFontSizeLg',
    '--border-width': 'www.themeTokenBorderWidth',
    '--space-pad': 'www.themeTokenPad',
    '--space-margin': 'www.themeTokenMargin',
    '--space-composer-pad': 'www.themeTokenComposerPad',
  };
  var HOVER = [
    '--color-hover-background',
    '--color-hover-border',
    '--color-hover-foreground',
  ];
  var TYPE = ['--font-size', '--font-size-sm', '--font-size-lg'];
  var RADIUS = ['--radius-sm', '--radius-md', '--radius-lg'];
  var SPACE = [
    '--border-width',
    '--space-pad',
    '--space-margin',
    '--space-composer-pad',
  ];

  var state = window.ECTheme.defaultTheme();
  state.name = '';
  state.author = '';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function t(key, vars) {
    return window.ECTheme.t(key, vars);
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var valid = window.ECTheme.validateTheme(parsed);
      if (valid) return valid;
      var tokens = window.ECTheme.validateTokens(parsed && parsed.tokens);
      if (!tokens) return null;
      return {
        schemaVersion: 1,
        name: typeof parsed.name === 'string' ? parsed.name : '',
        author: typeof parsed.author === 'string' ? parsed.author : '',
        fontFamily: window.ECTheme.sanitizeFontFamily(parsed.fontFamily),
        tokens: tokens,
      };
    } catch (e) {
      return null;
    }
  }

  function writeDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(window.ECTheme.exportTheme(state)));
    } catch (e) {
      /* ignore quota */
    }
  }

  function currentExport() {
    return window.ECTheme.exportTheme(state);
  }

  function setStatus(text, kind) {
    var el = $('[data-ec-theme-status]');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-ok', kind === 'ok');
  }

  var pushPreview = null;

  function previewTheme() {
    return {
      schemaVersion: 1,
      name: state.name || 'draft',
      author: state.author || 'draft',
      fontFamily: window.ECTheme.isValidFontFamily(state.fontFamily)
        ? window.ECTheme.sanitizeFontFamily(state.fontFamily)
        : '',
      tokens: state.tokens,
    };
  }

  function paintPreview() {
    if (pushPreview) {
      pushPreview();
      return;
    }
    var frame = $('[data-ec-preview-frame]');
    if (frame) window.ECTheme.postPreviewTheme(frame, previewTheme());
  }

  function syncFontStatus() {
    var status = $('[data-ec-font-status]');
    var input = $('[data-ec-theme-font]');
    if (!status || !input) return;
    var value = input.value.trim();
    if (!value) {
      status.hidden = true;
      status.textContent = '';
      return;
    }
    if (window.ECTheme.isValidFontFamily(value)) {
      status.hidden = true;
      status.textContent = '';
      return;
    }
    status.hidden = false;
    status.textContent = t('www.themeFontInvalid');
  }

  function collectState() {
    var nameEl = $('[data-ec-theme-name]');
    var authorEl = $('[data-ec-theme-author]');
    var fontEl = $('[data-ec-theme-font]');
    state.name = nameEl ? nameEl.value.trim() : '';
    state.author = authorEl ? authorEl.value.trim() : '';
    var typed = fontEl ? fontEl.value.trim() : '';
    state.fontFamily = window.ECTheme.isValidFontFamily(typed)
      ? window.ECTheme.sanitizeFontFamily(typed)
      : '';
    document.querySelectorAll('[data-ec-token]').forEach(function (el) {
      var name = el.getAttribute('data-ec-token');
      if (!name) return;
      if (el.getAttribute('data-kind') === 'color') {
        var hex = el.value;
        if (window.ECTheme.isValidHex(hex)) state.tokens[name] = hex.toLowerCase();
      } else {
        var n = Number(el.value);
        var spec = window.ECTheme.SIZE_TOKENS.find(function (s) {
          return s.name === name;
        });
        if (!spec || !isFinite(n)) return;
        if (n < spec.min) n = spec.min;
        if (n > spec.max) n = spec.max;
        state.tokens[name] = Math.round(n);
      }
    });
  }

  function applyStateToInputs() {
    var nameEl = $('[data-ec-theme-name]');
    var authorEl = $('[data-ec-theme-author]');
    var fontEl = $('[data-ec-theme-font]');
    if (nameEl) nameEl.value = state.name;
    if (authorEl) authorEl.value = state.author;
    if (fontEl) fontEl.value = state.fontFamily;
    document.querySelectorAll('[data-ec-token]').forEach(function (el) {
      var name = el.getAttribute('data-ec-token');
      if (!name || state.tokens[name] == null) return;
      el.value = state.tokens[name];
      var paired = document.querySelector(
        '[data-ec-token-text="' + name + '"]',
      );
      if (paired) paired.value = state.tokens[name];
    });
  }

  function onChange() {
    collectState();
    syncPaired();
    syncFontStatus();
    paintPreview();
    writeDraft();
  }

  function syncPaired() {
    document.querySelectorAll('[data-ec-token]').forEach(function (el) {
      var name = el.getAttribute('data-ec-token');
      var paired = document.querySelector(
        '[data-ec-token-text="' + name + '"]',
      );
      if (paired && paired !== document.activeElement) paired.value = el.value;
    });
  }

  function colorField(name) {
    var wrap = document.createElement('label');
    wrap.className = 'theme-color-field';
    var title = document.createElement('span');
    title.textContent = t(COLOR_LABELS[name] || name);
    var row = document.createElement('div');
    row.className = 'theme-color-row';
    var color = document.createElement('input');
    color.type = 'color';
    color.setAttribute('data-ec-token', name);
    color.setAttribute('data-kind', 'color');
    color.value = state.tokens[name];
    var hex = document.createElement('input');
    hex.type = 'text';
    hex.spellcheck = false;
    hex.maxLength = 7;
    hex.className = 'theme-hex';
    hex.setAttribute('data-ec-token-text', name);
    hex.value = state.tokens[name];
    hex.addEventListener('input', function () {
      var v = hex.value.trim();
      if (!window.ECTheme.isValidHex(v)) return;
      color.value = v;
      onChange();
    });
    color.addEventListener('input', onChange);
    row.appendChild(color);
    row.appendChild(hex);
    wrap.appendChild(title);
    wrap.appendChild(row);
    return wrap;
  }

  function sizeField(spec) {
    var wrap = document.createElement('label');
    wrap.className = 'theme-size-field';
    var title = document.createElement('span');
    title.textContent = t(SIZE_LABELS[spec.name] || spec.name);
    var row = document.createElement('div');
    row.className = 'theme-size-row';
    var range = document.createElement('input');
    range.type = 'range';
    range.min = String(spec.min);
    range.max = String(spec.max);
    range.step = '1';
    range.setAttribute('data-ec-token', spec.name);
    range.setAttribute('data-kind', 'size');
    range.value = String(state.tokens[spec.name]);
    var num = document.createElement('input');
    num.type = 'number';
    num.min = String(spec.min);
    num.max = String(spec.max);
    num.step = '1';
    num.className = 'theme-num';
    num.setAttribute('data-ec-token-text', spec.name);
    num.value = String(state.tokens[spec.name]);
    range.addEventListener('input', onChange);
    num.addEventListener('input', function () {
      var n = Number(num.value);
      if (!isFinite(n)) return;
      if (n < spec.min) n = spec.min;
      if (n > spec.max) n = spec.max;
      range.value = String(Math.round(n));
      onChange();
    });
    row.appendChild(range);
    row.appendChild(num);
    wrap.appendChild(title);
    wrap.appendChild(row);
    return wrap;
  }

  function fillColors(root, names) {
    if (!root) return;
    root.replaceChildren();
    names.forEach(function (name) {
      root.appendChild(colorField(name));
    });
  }

  function fillSizes(root, names) {
    if (!root) return;
    root.replaceChildren();
    var specs = window.ECTheme.SIZE_TOKENS.filter(function (s) {
      return names.indexOf(s.name) !== -1;
    });
    specs.forEach(function (spec) {
      root.appendChild(sizeField(spec));
    });
  }

  function downloadJson() {
    var blob = new Blob([JSON.stringify(currentExport(), null, 2)], {
      type: 'application/json',
    });
    var a = document.createElement('a');
    var slug = (state.name || 'theme')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'theme';
    a.href = URL.createObjectURL(blob);
    a.download = slug + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyJson() {
    var text = JSON.stringify(currentExport(), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setStatus(t('www.themeCopied'), 'ok');
        },
        function () {
          setStatus(t('www.themePublishError'), 'error');
        },
      );
      return;
    }
    setStatus(t('www.themePublishError'), 'error');
  }

  function resetDraft() {
    state = window.ECTheme.defaultTheme();
    state.name = '';
    state.author = '';
    applyStateToInputs();
    syncFontStatus();
    paintPreview();
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      /* ignore */
    }
    setStatus('', '');
  }

  function publish() {
    collectState();
    var valid = window.ECTheme.validateTheme(state);
    if (!valid) {
      setStatus(t('www.themePublishNeedName'), 'error');
      return;
    }
    var cfg = window.EC_SUPABASE;
    if (!cfg || !cfg.url || !cfg.anonKey) {
      setStatus(t('www.themePublishError'), 'error');
      return;
    }
    var btn = $('[data-ec-theme-publish]');
    if (btn) btn.disabled = true;
    setStatus(t('www.themePublishing'), '');
    window.ECTheme.publishTheme(cfg, valid)
      .then(function (data) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {
          /* ignore */
        }
        location.href = '/themes/' + encodeURIComponent(data.slug);
      })
      .catch(function (err) {
        if (btn) btn.disabled = false;
        setStatus(
          err && err.code === 'rate_limit'
            ? t('www.themePublishRateLimit')
            : t('www.themePublishError'),
          'error',
        );
      });
  }

  function boot() {
    var draft = readDraft();
    if (draft) {
      state = draft;
    } else {
      state.name = '';
      state.author = '';
      state.fontFamily = '';
    }

    var list = $('[data-ec-font-list]');
    if (list) {
      window.ECTheme.FONT_SUGGESTIONS.forEach(function (family) {
        var opt = document.createElement('option');
        opt.value = family;
        list.appendChild(opt);
      });
    }

    fillColors(
      $('[data-ec-color-fields]'),
      window.ECTheme.COLOR_TOKENS.filter(function (n) {
        return HOVER.indexOf(n) === -1;
      }),
    );
    fillColors($('[data-ec-hover-fields]'), HOVER);
    fillSizes($('[data-ec-type-fields]'), TYPE);
    fillSizes($('[data-ec-radius-fields]'), RADIUS);
    fillSizes($('[data-ec-space-fields]'), SPACE);

    applyStateToInputs();
    syncFontStatus();
    pushPreview = window.ECTheme.bindPreviewFrame(
      $('[data-ec-preview-frame]'),
      previewTheme,
    );
    paintPreview();

    ['data-ec-theme-name', 'data-ec-theme-author', 'data-ec-theme-font'].forEach(
      function (attr) {
        var el = $('[' + attr + ']');
        if (el) el.addEventListener('input', onChange);
      },
    );
    var publishBtn = $('[data-ec-theme-publish]');
    var exportBtn = $('[data-ec-theme-export]');
    var copyBtn = $('[data-ec-theme-copy]');
    var resetBtn = $('[data-ec-theme-reset]');
    if (publishBtn) publishBtn.addEventListener('click', publish);
    if (exportBtn) exportBtn.addEventListener('click', downloadJson);
    if (copyBtn) copyBtn.addEventListener('click', copyJson);
    if (resetBtn) resetBtn.addEventListener('click', resetDraft);
  }

  window.ECTheme.waitForCatalog(boot);
})();

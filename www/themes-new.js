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
  var appearance = 'light';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function t(key, vars) {
    return window.ECTheme.t(key, vars);
  }

  function tOr(key, fallback) {
    var value = t(key);
    return !value || value === key ? fallback : value;
  }

  var RESET_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

  function defaultTheme() {
    return window.ECTheme.defaultTheme();
  }

  function hexEq(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
  }

  function fieldIsDefault(kind, name) {
    var def = defaultTheme();
    if (kind === 'color') {
      return hexEq(
        state.tokens[appearance][name],
        def.tokens[appearance][name],
      );
    }
    if (kind === 'size') {
      return Number(state.tokens[name]) === Number(def.tokens[name]);
    }
    if (kind === 'font') {
      return !state.fontFamily;
    }
    if (kind === 'icon') {
      return (
        window.ECTheme.sanitizeIconPack(state.iconPack) ===
        window.ECTheme.DEFAULT_ICON_PACK
      );
    }
    return true;
  }

  function resetField(kind, name) {
    var def = defaultTheme();
    if (kind === 'color') {
      state.tokens[appearance][name] = def.tokens[appearance][name];
    } else if (kind === 'size') {
      state.tokens[name] = def.tokens[name];
    } else if (kind === 'font') {
      state.fontFamily = '';
    } else if (kind === 'icon') {
      state.iconPack = window.ECTheme.DEFAULT_ICON_PACK;
    }
    applyStateToInputs();
    syncFontStatus();
    paintPreview();
    writeDraft();
  }

  function makeResetBtn(kind, name) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-field-reset';
    btn.setAttribute('data-ec-reset', kind);
    if (name) btn.setAttribute('data-ec-reset-name', name);
    btn.setAttribute(
      'aria-label',
      tOr('www.themeResetImport', 'Reset to default'),
    );
    btn.innerHTML = RESET_SVG;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      resetField(kind, name);
    });
    return btn;
  }

  function syncFieldResets() {
    document.querySelectorAll('[data-ec-reset]').forEach(function (btn) {
      var kind = btn.getAttribute('data-ec-reset');
      var name = btn.getAttribute('data-ec-reset-name');
      var atDefault = fieldIsDefault(kind, name);
      btn.disabled = atDefault;
      btn.setAttribute('aria-disabled', atDefault ? 'true' : 'false');
    });
  }

  function bindStaticResets() {
    document.querySelectorAll('[data-ec-reset]').forEach(function (btn) {
      if (btn.getAttribute('data-ec-reset-bound')) return;
      btn.setAttribute('data-ec-reset-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled) return;
        resetField(
          btn.getAttribute('data-ec-reset'),
          btn.getAttribute('data-ec-reset-name'),
        );
      });
    });
  }

  var confirmOnOk = null;

  function closeConfirm() {
    var root = $('[data-ec-theme-confirm]');
    if (root) root.hidden = true;
    confirmOnOk = null;
  }

  function openConfirm(opts, onOk) {
    var root = $('[data-ec-theme-confirm]');
    if (!root) {
      onOk();
      return;
    }
    var title = $('[data-ec-theme-confirm-title]', root);
    var body = $('[data-ec-theme-confirm-body]', root);
    var ok = $('[data-ec-theme-confirm-ok]', root);
    if (title) title.textContent = opts.title;
    if (body) body.textContent = opts.body;
    if (ok) ok.textContent = opts.ok;
    confirmOnOk = onOk;
    root.hidden = false;
    if (ok) ok.focus();
  }

  function bindConfirm() {
    var root = $('[data-ec-theme-confirm]');
    if (!root || root.getAttribute('data-ec-bound')) return;
    root.setAttribute('data-ec-bound', '1');
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-ec-theme-confirm-cancel]')) {
        closeConfirm();
        return;
      }
      if (e.target.closest('[data-ec-theme-confirm-ok]')) {
        var fn = confirmOnOk;
        closeConfirm();
        if (fn) fn();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root && !root.hidden) closeConfirm();
    });
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
        iconPack: window.ECTheme.sanitizeIconPack(parsed.iconPack),
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
      theme: {
        schemaVersion: 1,
        name: state.name || 'draft',
        author: state.author || 'draft',
        fontFamily: window.ECTheme.isValidFontFamily(state.fontFamily)
          ? window.ECTheme.sanitizeFontFamily(state.fontFamily)
          : '',
        iconPack: window.ECTheme.sanitizeIconPack(state.iconPack),
        tokens: state.tokens,
      },
      appearance: appearance,
    };
  }

  function paintPreview() {
    if (pushPreview) {
      pushPreview();
      return;
    }
    var frame = $('[data-ec-preview-frame]');
    var payload = previewTheme();
    if (frame) {
      window.ECTheme.postPreviewTheme(frame, payload.theme, payload.appearance);
    }
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
    if (!state.iconPack) state.iconPack = window.ECTheme.DEFAULT_ICON_PACK;
    document.querySelectorAll('[data-ec-token]').forEach(function (el) {
      var name = el.getAttribute('data-ec-token');
      if (!name) return;
      if (el.getAttribute('data-kind') === 'color') {
        var hex = el.value;
        if (window.ECTheme.isValidHex(hex)) {
          state.tokens[appearance][name] = hex.toLowerCase();
        }
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
    syncFontPicker();
    document.querySelectorAll('[data-ec-token]').forEach(function (el) {
      var name = el.getAttribute('data-ec-token');
      if (!name) return;
      var value =
        el.getAttribute('data-kind') === 'color'
          ? state.tokens[appearance][name]
          : state.tokens[name];
      if (value == null) return;
      el.value = value;
      var paired = document.querySelector(
        '[data-ec-token-text="' + name + '"]',
      );
      if (paired) paired.value = value;
    });
    syncAppearanceTabs();
    syncIconPack();
    syncFieldResets();
  }

  function onChange() {
    collectState();
    syncPaired();
    syncFontStatus();
    paintPreview();
    writeDraft();
    syncFieldResets();
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
    var head = document.createElement('span');
    head.className = 'theme-field-head';
    var title = document.createElement('span');
    title.textContent = t(COLOR_LABELS[name] || name);
    head.appendChild(title);
    head.appendChild(makeResetBtn('color', name));
    var row = document.createElement('div');
    row.className = 'theme-color-row';
    var color = document.createElement('input');
    color.type = 'color';
    color.setAttribute('data-ec-token', name);
    color.setAttribute('data-kind', 'color');
    color.value = state.tokens[appearance][name];
    var hex = document.createElement('input');
    hex.type = 'text';
    hex.spellcheck = false;
    hex.maxLength = 7;
    hex.className = 'theme-hex';
    hex.setAttribute('data-ec-token-text', name);
    hex.value = state.tokens[appearance][name];
    hex.addEventListener('input', function () {
      var v = hex.value.trim();
      if (!window.ECTheme.isValidHex(v)) return;
      color.value = v;
      onChange();
    });
    color.addEventListener('input', onChange);
    row.appendChild(color);
    row.appendChild(hex);
    wrap.appendChild(head);
    wrap.appendChild(row);
    return wrap;
  }

  function sizeField(spec) {
    var wrap = document.createElement('label');
    wrap.className = 'theme-size-field';
    var head = document.createElement('span');
    head.className = 'theme-field-head';
    var title = document.createElement('span');
    title.textContent = t(SIZE_LABELS[spec.name] || spec.name);
    head.appendChild(title);
    head.appendChild(makeResetBtn('size', spec.name));
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
    wrap.appendChild(head);
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
    appearance = 'light';
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

  var FONT_ROW = 36;
  var FONT_OVERSCAN = 6;
  var fontCatalog = window.ECTheme.FONT_SUGGESTIONS.slice();
  var fontQuery = '';
  var fontActive = 0;
  var fontPreviewLoaded = {};
  var fontPickerBound = false;

  function defaultFontLabel() {
    var label = t('www.themeFontDefault');
    return label === 'www.themeFontDefault' ? 'Default' : label;
  }

  function fontStack(family) {
    return '"' + family + '", ui-sans-serif, system-ui, sans-serif';
  }

  function loadPickerFonts(families) {
    var need = [];
    families.forEach(function (family) {
      var safe = window.ECTheme.sanitizeFontFamily(family);
      if (!safe || fontPreviewLoaded[safe]) return;
      fontPreviewLoaded[safe] = true;
      need.push(safe);
    });
    if (need.length) window.ECTheme.loadGoogleFontPreviews(document, need);
  }

  function catalogSet() {
    var set = {};
    fontCatalog.forEach(function (family) {
      set[family] = true;
    });
    return set;
  }

  function fontItems() {
    var q = fontQuery.trim().toLowerCase();
    var known = catalogSet();
    var popular = [];
    var seen = {};
    window.ECTheme.FONT_SUGGESTIONS.forEach(function (family) {
      if (!known[family] || seen[family]) return;
      seen[family] = true;
      popular.push(family);
    });
    var current = window.ECTheme.sanitizeFontFamily(state.fontFamily);
    if (current && !known[current] && !seen[current]) {
      popular.unshift(current);
      seen[current] = true;
    }
    var rest = fontCatalog.filter(function (family) {
      return !seen[family];
    });
    var families = q ? fontCatalog.slice() : popular.concat(rest);
    if (q) {
      families = families.filter(function (family) {
        return family.toLowerCase().indexOf(q) !== -1;
      });
    }
    var items = [];
    if (!q || defaultFontLabel().toLowerCase().indexOf(q) !== -1) {
      items.push({ family: '', label: defaultFontLabel() });
    }
    families.forEach(function (family) {
      items.push({ family: family, label: family });
    });
    return items;
  }

  function paintFontTrigger() {
    var label = $('[data-ec-font-label]');
    var family = window.ECTheme.sanitizeFontFamily(state.fontFamily);
    if (!label) return;
    if (family) {
      label.textContent = family;
      label.style.fontFamily = fontStack(family);
      loadPickerFonts([family]);
    } else {
      label.textContent = defaultFontLabel();
      label.style.fontFamily = '';
    }
  }

  function syncFontPicker() {
    paintFontTrigger();
    if ($('[data-ec-font-picker]') && $('[data-ec-font-picker]').classList.contains('is-open')) {
      renderFontList();
    }
  }

  function selectFont(family) {
    var typed = (family || '').trim();
    var fontEl = $('[data-ec-theme-font]');
    var safe = window.ECTheme.isValidFontFamily(typed)
      ? window.ECTheme.sanitizeFontFamily(typed)
      : '';
    if (fontEl) fontEl.value = safe;
    state.fontFamily = safe;
    closeFontMenu();
    paintFontTrigger();
    syncFontStatus();
    paintPreview();
    writeDraft();
  }

  function renderFontList() {
    var viewport = $('[data-ec-font-viewport]');
    var spacer = $('[data-ec-font-spacer]');
    var empty = $('[data-ec-font-empty]');
    var trigger = $('[data-ec-font-trigger]');
    if (!viewport || !spacer) return;
    var items = fontItems();
    if (fontActive < 0) fontActive = 0;
    if (fontActive >= items.length) fontActive = Math.max(0, items.length - 1);
    if (empty) empty.hidden = items.length > 0;
    viewport.hidden = items.length === 0;
    spacer.style.height = items.length * FONT_ROW + 'px';
    var scrollTop = viewport.scrollTop;
    var start = Math.max(0, Math.floor(scrollTop / FONT_ROW) - FONT_OVERSCAN);
    var end = Math.min(
      items.length,
      Math.ceil((scrollTop + viewport.clientHeight) / FONT_ROW) + FONT_OVERSCAN,
    );
    var visible = items.slice(start, end);
    var selected = window.ECTheme.sanitizeFontFamily(state.fontFamily);
    spacer.replaceChildren();
    visible.forEach(function (item, offset) {
      var index = start + offset;
      var opt = document.createElement('div');
      opt.setAttribute('role', 'option');
      opt.id = 'ec-font-opt-' + index;
      opt.className = 'theme-font-option' + (index === fontActive ? ' is-active' : '');
      opt.style.top = index * FONT_ROW + 'px';
      opt.setAttribute('data-family', item.family);
      opt.setAttribute('aria-selected', item.family === selected ? 'true' : 'false');
      var check = document.createElement('span');
      check.className = 'theme-font-option-check';
      check.setAttribute('aria-hidden', 'true');
      if (item.family === selected) {
        check.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      }
      var text = document.createElement('span');
      text.className = 'theme-font-option-label';
      text.textContent = item.label;
      if (item.family) text.style.fontFamily = fontStack(item.family);
      opt.appendChild(check);
      opt.appendChild(text);
      spacer.appendChild(opt);
    });
    loadPickerFonts(
      visible
        .map(function (item) {
          return item.family;
        })
        .filter(Boolean),
    );
    if (trigger && items[fontActive]) {
      trigger.setAttribute('aria-activedescendant', 'ec-font-opt-' + fontActive);
    } else if (trigger) {
      trigger.removeAttribute('aria-activedescendant');
    }
  }

  function scrollActiveFontIntoView() {
    var viewport = $('[data-ec-font-viewport]');
    if (!viewport) return;
    var top = fontActive * FONT_ROW;
    var bottom = top + FONT_ROW;
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (bottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = bottom - viewport.clientHeight;
    }
  }

  function openFontMenu() {
    var picker = $('[data-ec-font-picker]');
    var menu = $('[data-ec-font-menu]');
    var trigger = $('[data-ec-font-trigger]');
    var search = $('[data-ec-font-search]');
    var viewport = $('[data-ec-font-viewport]');
    if (!picker || !menu || !trigger) return;
    picker.classList.add('is-open');
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    var items = fontItems();
    var selected = window.ECTheme.sanitizeFontFamily(state.fontFamily);
    fontActive = 0;
    items.forEach(function (item, i) {
      if (item.family === selected) fontActive = i;
    });
    renderFontList();
    if (viewport) viewport.scrollTop = Math.max(0, fontActive * FONT_ROW - FONT_ROW * 2);
    renderFontList();
    if (search) {
      search.value = fontQuery;
      search.focus();
    }
  }

  function closeFontMenu() {
    var picker = $('[data-ec-font-picker]');
    var menu = $('[data-ec-font-menu]');
    var trigger = $('[data-ec-font-trigger]');
    var search = $('[data-ec-font-search]');
    if (!picker || !menu || !trigger) return;
    if (menu.hidden) return;
    picker.classList.remove('is-open');
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    fontQuery = '';
    if (search) search.value = '';
  }

  function bindFontPicker() {
    var picker = $('[data-ec-font-picker]');
    var trigger = $('[data-ec-font-trigger]');
    var menu = $('[data-ec-font-menu]');
    var search = $('[data-ec-font-search]');
    var viewport = $('[data-ec-font-viewport]');
    if (!picker || !trigger || !menu || fontPickerBound) {
      paintFontTrigger();
      return;
    }
    fontPickerBound = true;

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (menu.hidden) openFontMenu();
      else closeFontMenu();
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (menu.hidden) openFontMenu();
      }
    });
    search.addEventListener('input', function () {
      fontQuery = search.value;
      fontActive = 0;
      if (viewport) viewport.scrollTop = 0;
      renderFontList();
    });
    search.addEventListener('keydown', function (e) {
      var items = fontItems();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        fontActive = Math.min(items.length - 1, fontActive + 1);
        scrollActiveFontIntoView();
        renderFontList();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        fontActive = Math.max(0, fontActive - 1);
        scrollActiveFontIntoView();
        renderFontList();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        fontActive = 0;
        scrollActiveFontIntoView();
        renderFontList();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        fontActive = Math.max(0, items.length - 1);
        scrollActiveFontIntoView();
        renderFontList();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (items[fontActive]) selectFont(items[fontActive].family);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFontMenu();
        trigger.focus();
      }
    });
    viewport.addEventListener('scroll', function () {
      renderFontList();
    });
    menu.addEventListener('mousedown', function (e) {
      if (e.target === search) return;
      e.preventDefault();
    });
    menu.addEventListener('click', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (opt && menu.contains(opt)) selectFont(opt.getAttribute('data-family') || '');
    });
    menu.addEventListener('mousemove', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (!opt) return;
      var index = Number(opt.id.replace('ec-font-opt-', ''));
      if (!isFinite(index) || index === fontActive) return;
      fontActive = index;
      renderFontList();
    });
    document.addEventListener('mousedown', function (e) {
      if (!picker.contains(e.target)) closeFontMenu();
    });

    paintFontTrigger();
    fetch('/google-fonts.json')
      .then(function (res) {
        if (!res.ok) throw new Error('fonts');
        return res.json();
      })
      .then(function (data) {
        var names = data && Array.isArray(data.families) ? data.families : [];
        var next = [];
        var seen = {};
        names.forEach(function (family) {
          var safe = window.ECTheme.sanitizeFontFamily(family);
          if (!safe || seen[safe]) return;
          seen[safe] = true;
          next.push(safe);
        });
        if (next.length) fontCatalog = next;
        if (!menu.hidden) renderFontList();
      })
      .catch(function () {
        /* curated suggestions remain */
      });
  }

  function syncAppearanceTabs() {
    document.querySelectorAll('[data-ec-appearance]').forEach(function (btn) {
      var mode = btn.getAttribute('data-ec-appearance');
      var on = mode === appearance;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setAppearance(mode) {
    if (mode !== 'light' && mode !== 'dark') return;
    collectState();
    appearance = mode;
    applyStateToInputs();
    paintPreview();
    writeDraft();
  }

  function bindAppearanceTabs() {
    document.querySelectorAll('[data-ec-appearance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setAppearance(btn.getAttribute('data-ec-appearance'));
      });
    });
    syncAppearanceTabs();
  }

  function syncIconPack() {
    var pack = window.ECTheme.sanitizeIconPack(state.iconPack);
    document.querySelectorAll('[data-ec-icon-pack]').forEach(function (btn) {
      var id = btn.getAttribute('data-ec-icon-pack');
      var on = id === pack;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setIconPack(id) {
    if (!window.ECTheme.isValidIconPack(id)) return;
    state.iconPack = id;
    syncIconPack();
    paintPreview();
    writeDraft();
    syncFieldResets();
  }

  function bindIconPacks() {
    var root = $('[data-ec-icon-packs]');
    var icons = window.ECIcons;
    if (!root || !icons) return;
    root.replaceChildren();
    icons.ICON_PACKS.forEach(function (pack) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-icon-pack';
      btn.setAttribute('data-ec-icon-pack', pack.id);
      btn.setAttribute('aria-pressed', 'false');
      var name = document.createElement('span');
      name.className = 'theme-icon-pack-name';
      name.textContent = pack.label;
      var row = document.createElement('span');
      row.className = 'theme-icon-pack-glyphs';
      row.setAttribute('aria-hidden', 'true');
      icons.PREVIEW_ICONS.forEach(function (icon) {
        var wrap = document.createElement('span');
        wrap.className = 'theme-icon-pack-glyph';
        wrap.innerHTML = icons.iconSvg(pack.id, icon, 16);
        row.appendChild(wrap);
      });
      btn.appendChild(name);
      btn.appendChild(row);
      btn.addEventListener('click', function () {
        setIconPack(pack.id);
      });
      root.appendChild(btn);
    });
    syncIconPack();
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

    bindFontPicker();
    bindAppearanceTabs();
    bindIconPacks();
    bindStaticResets();
    bindConfirm();

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

    ['data-ec-theme-name', 'data-ec-theme-author'].forEach(function (attr) {
      var el = $('[' + attr + ']');
      if (el) el.addEventListener('input', onChange);
    });
    var publishBtn = $('[data-ec-theme-publish]');
    var exportBtn = $('[data-ec-theme-export]');
    var copyBtn = $('[data-ec-theme-copy]');
    var resetBtn = $('[data-ec-theme-reset]');
    if (publishBtn) {
      publishBtn.addEventListener('click', function () {
        collectState();
        if (!window.ECTheme.validateTheme(state)) {
          setStatus(t('www.themePublishNeedName'), 'error');
          return;
        }
        openConfirm(
          {
            title: tOr('www.themeConfirmPublishTitle', 'Publish this theme?'),
            body: tOr(
              'www.themeConfirmPublishBody',
              'It will appear in the public gallery with the name and author you entered.',
            ),
            ok: tOr('www.themePublish', 'Publish'),
          },
          publish,
        );
      });
    }
    if (exportBtn) exportBtn.addEventListener('click', downloadJson);
    if (copyBtn) copyBtn.addEventListener('click', copyJson);
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        openConfirm(
          {
            title: tOr('www.themeConfirmResetTitle', 'Reset this theme?'),
            body: tOr(
              'www.themeConfirmResetBody',
              'Every field goes back to the default theme. You will lose unsaved edits.',
            ),
            ok: tOr('www.themeReset', 'Reset'),
          },
          resetDraft,
        );
      });
    }
  }

  window.ECTheme.waitForCatalog(boot);
})();

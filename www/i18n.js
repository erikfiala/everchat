/**
 * Marketing-site i18n: loads /locales/{code}.json and applies [data-i18n] nodes.
 * Preference key: ec-locale (shared with extension).
 */
(function () {
  var STORAGE_KEY = 'ec-locale';
  var RTL = {
    ar: 1,
    he: 1,
    fa: 1,
    ur: 1,
    yi: 1,
    dv: 1,
    ps: 1,
    ku: 1,
    ckb: 1,
    sd: 1,
    ug: 1,
    syr: 1,
  };

  var LANGUAGES = [
    { code: 'en', nativeLabel: 'English' },
    { code: 'ar', nativeLabel: 'العربية' },
    { code: 'bg', nativeLabel: 'Български' },
    { code: 'bn', nativeLabel: 'বাংলা' },
    { code: 'ca', nativeLabel: 'Català' },
    { code: 'cs', nativeLabel: 'Čeština' },
    { code: 'da', nativeLabel: 'Dansk' },
    { code: 'de', nativeLabel: 'Deutsch' },
    { code: 'el', nativeLabel: 'Ελληνικά' },
    { code: 'es', nativeLabel: 'Español' },
    { code: 'et', nativeLabel: 'Eesti' },
    { code: 'fa', nativeLabel: 'فارسی' },
    { code: 'fi', nativeLabel: 'Suomi' },
    { code: 'fr', nativeLabel: 'Français' },
    { code: 'gu', nativeLabel: 'ગુજરાતી' },
    { code: 'he', nativeLabel: 'עברית' },
    { code: 'hi', nativeLabel: 'हिन्दी' },
    { code: 'hr', nativeLabel: 'Hrvatski' },
    { code: 'hu', nativeLabel: 'Magyar' },
    { code: 'id', nativeLabel: 'Bahasa Indonesia' },
    { code: 'it', nativeLabel: 'Italiano' },
    { code: 'ja', nativeLabel: '日本語' },
    { code: 'kn', nativeLabel: 'ಕನ್ನಡ' },
    { code: 'ko', nativeLabel: '한국어' },
    { code: 'lt', nativeLabel: 'Lietuvių' },
    { code: 'lv', nativeLabel: 'Latviešu' },
    { code: 'ml', nativeLabel: 'മലയാളം' },
    { code: 'mr', nativeLabel: 'मराठी' },
    { code: 'ms', nativeLabel: 'Bahasa Melayu' },
    { code: 'nb', nativeLabel: 'Norsk bokmål' },
    { code: 'nl', nativeLabel: 'Nederlands' },
    { code: 'pl', nativeLabel: 'Polski' },
    { code: 'pt', nativeLabel: 'Português' },
    { code: 'pt-BR', nativeLabel: 'Português (Brasil)' },
    { code: 'ro', nativeLabel: 'Română' },
    { code: 'ru', nativeLabel: 'Русский' },
    { code: 'sk', nativeLabel: 'Slovenčina' },
    { code: 'sl', nativeLabel: 'Slovenščina' },
    { code: 'sr', nativeLabel: 'Српски' },
    { code: 'sv', nativeLabel: 'Svenska' },
    { code: 'sw', nativeLabel: 'Kiswahili' },
    { code: 'ta', nativeLabel: 'தமிழ்' },
    { code: 'te', nativeLabel: 'తెలుగు' },
    { code: 'th', nativeLabel: 'ไทย' },
    { code: 'tr', nativeLabel: 'Türkçe' },
    { code: 'uk', nativeLabel: 'Українська' },
    { code: 'ur', nativeLabel: 'اردو' },
    { code: 'vi', nativeLabel: 'Tiếng Việt' },
    { code: 'zh-CN', nativeLabel: '简体中文' },
    { code: 'zh-TW', nativeLabel: '繁體中文' },
  ];

  var SUPPORTED = {};
  LANGUAGES.forEach(function (l) {
    SUPPORTED[l.code] = true;
  });

  function matchLocale(tag) {
    if (!tag) return 'en';
    var n = String(tag).replace(/_/g, '-');
    if (SUPPORTED[n]) return n;
    var lower = n.toLowerCase();
    if (SUPPORTED[lower]) return lower;
    if (lower.indexOf('zh') === 0) {
      if (
        lower.indexOf('hant') >= 0 ||
        lower.indexOf('tw') >= 0 ||
        lower.indexOf('hk') >= 0
      ) {
        return 'zh-TW';
      }
      return 'zh-CN';
    }
    if (lower.indexOf('pt-br') === 0) return 'pt-BR';
    if (lower.indexOf('pt') === 0) return 'pt';
    if (lower.indexOf('nb') === 0 || lower === 'no') return 'nb';
    var primary = lower.split('-')[0];
    if (SUPPORTED[primary]) return primary;
    return 'en';
  }

  function readPreference() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'system' || SUPPORTED[raw]) return raw;
    } catch (_) {}
    return 'system';
  }

  function resolveLocale(pref) {
    if (pref && pref !== 'system') return matchLocale(pref);
    var tag =
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      'en';
    return matchLocale(tag);
  }

  function interpolate(template, vars) {
    if (!vars) return template;
    return String(template).replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return vars[key] == null ? '' : String(vars[key]);
    });
  }

  function applyDir(locale) {
    var primary = locale.toLowerCase().split('-')[0];
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL[primary] ? 'rtl' : 'ltr';
  }

  function applyCatalog(catalog) {
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key || catalog[key] == null) return;
      var text = interpolate(catalog[key], { year: year });
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, text);
      } else if (el.hasAttribute('data-i18n-html')) {
        // Trusted catalog fragments may include <code>…</code> only.
        if (isSafeCodeHtml(text)) {
          el.innerHTML = text;
        } else {
          el.textContent = text.replace(/<\/?code>/gi, '');
        }
      } else {
        el.textContent = text;
      }
    });
    if (catalog['www.title']) document.title = catalog['www.title'];
    var meta = document.querySelector('meta[name="description"]');
    if (meta && catalog['www.metaDescription']) {
      meta.setAttribute('content', catalog['www.metaDescription']);
    }
  }

  /** Allow plain text plus optional <code>…</code> wrappers (no other tags). */
  function isSafeCodeHtml(html) {
    var stripped = String(html).replace(/<\/?code>/gi, '');
    return stripped.indexOf('<') === -1 && stripped.indexOf('>') === -1;
  }

  var enhanceId = 0;
  var openRoot = null;
  var activeIndex = -1;
  var typeBuffer = '';
  var typeTimer = null;

  function systemLabel() {
    return (
      (window.__ecCatalog && window.__ecCatalog['chat.languageSystem']) ||
      'System'
    );
  }

  function labelForValue(value) {
    if (value === 'system') return systemLabel();
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === value) return LANGUAGES[i].nativeLabel;
    }
    return value;
  }

  function optionsOf(root) {
    return Array.prototype.slice.call(root.querySelectorAll('[role="option"]'));
  }

  function closeMenu(root) {
    if (!root) return;
    var trigger = root.querySelector('[data-ec-lang-trigger]');
    var menu = root.querySelector('[data-ec-lang-menu]');
    if (menu) menu.hidden = true;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
    }
    root.classList.remove('is-open');
    if (openRoot === root) openRoot = null;
    activeIndex = -1;
    typeBuffer = '';
  }

  function highlight(root, index) {
    var opts = optionsOf(root);
    if (!opts.length) return;
    if (index < 0) index = opts.length - 1;
    if (index >= opts.length) index = 0;
    activeIndex = index;
    opts.forEach(function (opt, i) {
      opt.classList.toggle('is-active', i === index);
    });
    var trigger = root.querySelector('[data-ec-lang-trigger]');
    if (trigger && opts[index].id) {
      trigger.setAttribute('aria-activedescendant', opts[index].id);
    }
    if (opts[index].scrollIntoView) {
      opts[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function openMenu(root) {
    if (openRoot && openRoot !== root) closeMenu(openRoot);
    var trigger = root.querySelector('[data-ec-lang-trigger]');
    var menu = root.querySelector('[data-ec-lang-menu]');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    openRoot = root;
    var opts = optionsOf(root);
    var selected = -1;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('aria-selected') === 'true') {
        selected = i;
        break;
      }
    }
    highlight(root, selected >= 0 ? selected : 0);
  }

  function toggleMenu(root) {
    if (openRoot === root) closeMenu(root);
    else openMenu(root);
  }

  function commitValue(root, value) {
    var next = value || 'system';
    root.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    closeMenu(root);
    apply(next);
    root.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function typeFind(root, key) {
    if (key.length !== 1 || key < ' ') return;
    typeBuffer += key.toLowerCase();
    clearTimeout(typeTimer);
    typeTimer = setTimeout(function () {
      typeBuffer = '';
    }, 500);
    var opts = optionsOf(root);
    var start = activeIndex + 1;
    for (var n = 0; n < opts.length; n++) {
      var i = (start + n) % opts.length;
      var text = (opts[i].textContent || '').trim().toLowerCase();
      if (text.indexOf(typeBuffer) === 0) {
        highlight(root, i);
        return;
      }
    }
  }

  function handleTriggerKey(root, e) {
    var open = openRoot === root;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu(root);
        if (e.key === 'ArrowUp') highlight(root, optionsOf(root).length - 1);
        return;
      }
      highlight(root, activeIndex + (e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (e.key === 'Home' && open) {
      e.preventDefault();
      highlight(root, 0);
      return;
    }
    if (e.key === 'End' && open) {
      e.preventDefault();
      highlight(root, optionsOf(root).length - 1);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      var opts = optionsOf(root);
      if (opts[activeIndex]) {
        commitValue(root, opts[activeIndex].getAttribute('data-value'));
      }
      return;
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeMenu(root);
      return;
    }
    if (e.key === 'Tab' && open) {
      closeMenu(root);
      return;
    }
    if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!open) openMenu(root);
      typeFind(root, e.key);
    }
  }

  function fillSwitcher(root, pref, locale) {
    if (!root) return;
    var selected = pref === 'system' ? 'system' : locale;
    root.value = selected;
    var label = root.querySelector('[data-ec-lang-label]');
    var menu = root.querySelector('[data-ec-lang-menu]');
    var trigger = root.querySelector('[data-ec-lang-trigger]');
    if (label) label.textContent = labelForValue(selected);
    if (!menu) return;

    var wasOpen = openRoot === root;
    if (wasOpen) closeMenu(root);

    var uid = menu.id || (trigger && trigger.id) || 'ec-lang';
    menu.innerHTML = '';
    var items = [{ code: 'system', nativeLabel: systemLabel() }].concat(
      LANGUAGES,
    );
    items.forEach(function (l) {
      var opt = document.createElement('div');
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-value', l.code);
      opt.id = uid + '-opt-' + l.code;
      opt.className = 'ec-select-item';
      if (l.code === selected) opt.setAttribute('aria-selected', 'true');
      var check = document.createElement('span');
      check.className = 'ec-select-check';
      check.setAttribute('aria-hidden', 'true');
      if (l.code === selected) {
        check.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      }
      var text = document.createElement('span');
      text.className = 'ec-select-item-label';
      text.textContent = l.nativeLabel;
      opt.appendChild(check);
      opt.appendChild(text);
      menu.appendChild(opt);
    });
  }

  function enhanceSwitcher(root) {
    if (root.getAttribute('data-ec-enhanced') === '1') return;
    root.setAttribute('data-ec-enhanced', '1');
    if (root.value == null) root.value = 'system';

    var trigger = root.querySelector('[data-ec-lang-trigger]');
    var menu = root.querySelector('[data-ec-lang-menu]');
    if (!trigger || !menu) return;

    enhanceId += 1;
    var uid = 'ec-lang-' + enhanceId;
    if (!trigger.id) trigger.id = uid + '-trigger';
    if (!menu.id) menu.id = uid + '-menu';
    trigger.setAttribute('aria-controls', menu.id);

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      toggleMenu(root);
    });
    trigger.addEventListener('keydown', function (e) {
      handleTriggerKey(root, e);
    });
    menu.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });
    menu.addEventListener('click', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (opt && menu.contains(opt)) {
        commitValue(root, opt.getAttribute('data-value'));
      }
    });
    menu.addEventListener('mousemove', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (!opt) return;
      var i = optionsOf(root).indexOf(opt);
      if (i >= 0) highlight(root, i);
    });
  }

  function loadLocale(code) {
    return fetch('/locales/en.json')
      .then(function (r) {
        if (!r.ok) throw new Error('en');
        return r.json();
      })
      .then(function (en) {
        if (code === 'en') return en;
        return fetch('/locales/' + encodeURIComponent(code) + '.json')
          .then(function (r) {
            if (!r.ok) throw new Error('locale');
            return r.json();
          })
          .then(function (catalog) {
            return Object.assign({}, en, catalog);
          })
          .catch(function () {
            return en;
          });
      });
  }

  function apply(pref) {
    var locale = resolveLocale(pref);
    applyDir(locale);
    return loadLocale(locale).then(function (catalog) {
      window.__ecCatalog = catalog;
      applyCatalog(catalog);
      document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
        fillSwitcher(sel, pref, locale);
      });
    });
  }

  document.addEventListener('mousedown', function (e) {
    if (openRoot && !openRoot.contains(e.target)) closeMenu(openRoot);
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-ec-lang]').forEach(enhanceSwitcher);
    apply(readPreference());
  });
})();

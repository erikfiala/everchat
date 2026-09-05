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

  function fillSwitcher(select, pref, locale) {
    if (!select) return;
    select.innerHTML = '';
    var sys = document.createElement('option');
    sys.value = 'system';
    sys.textContent = (window.__ecCatalog && window.__ecCatalog['chat.languageSystem']) || 'System';
    select.appendChild(sys);
    LANGUAGES.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.nativeLabel;
      select.appendChild(opt);
    });
    select.value = pref === 'system' ? 'system' : locale;
  }

  function loadLocale(code) {
    return fetch('/locales/' + encodeURIComponent(code) + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('locale');
        return r.json();
      })
      .catch(function () {
        return fetch('/locales/en.json').then(function (r) {
          return r.json();
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

  document.addEventListener('DOMContentLoaded', function () {
    var pref = readPreference();
    apply(pref);
    document.querySelectorAll('[data-ec-lang]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var next = sel.value || 'system';
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (_) {}
        apply(next);
      });
    });
  });
})();

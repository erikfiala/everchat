/**
 * Early lang/dir boot for sidepanel (FOUC-safe). Preference key: ec-locale.
 */
(function () {
  try {
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
    var tag = '';
    var stored = localStorage.getItem('ec-locale');
    if (stored && stored !== 'system') {
      tag = stored;
    } else {
      try {
        if (
          typeof chrome !== 'undefined' &&
          chrome.i18n &&
          chrome.i18n.getUILanguage
        ) {
          tag = chrome.i18n.getUILanguage() || '';
        }
      } catch (_) {}
      if (!tag && navigator.languages && navigator.languages.length) {
        tag = navigator.languages[0] || '';
      }
      if (!tag) tag = navigator.language || 'en';
    }
    tag = String(tag).replace(/_/g, '-');
    var primary = tag.toLowerCase().split('-')[0] || 'en';
    document.documentElement.lang = tag || 'en';
    document.documentElement.dir = RTL[primary] ? 'rtl' : 'ltr';
  } catch (_) {}
})();

/**
 * Early theme boot for sidepanel (FOUC-safe). Preference key: ec-theme.
 */
(function () {
  try {
    var raw = localStorage.getItem('ec-theme');
    var pref =
      raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
    var resolved =
      pref === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : pref;
    document.documentElement.dataset.theme = resolved;
  } catch (_) {}
})();

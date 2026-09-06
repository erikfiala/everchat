/**
 * Fill the landing GitHub stars chip.
 * Prefer the public repo API; fall back to shields.io and last known count.
 */
(function () {
  var REPO = 'everchathq/everchat';
  var STORAGE_KEY = 'ec-github-stars';
  var el = document.querySelector('[data-github-stars]');
  if (!el) return;

  function show(count) {
    if (typeof count !== 'number' || !isFinite(count) || count < 0) return false;
    var n = Math.round(count);
    el.textContent = String(n);
    try {
      localStorage.setItem(STORAGE_KEY, String(n));
    } catch (_) {}
    return true;
  }

  try {
    var cached = localStorage.getItem(STORAGE_KEY);
    if (cached && /^\d+$/.test(cached)) el.textContent = cached;
  } catch (_) {}

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) return null;
      return res.json();
    });
  }

  function fromGithub(data) {
    return data && typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
  }

  function fromShields(data) {
    var raw = data && (data.value || data.message);
    if (typeof raw !== 'string') return null;
    var s = raw.trim().toLowerCase();
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    if (s.slice(-1) === 'k') return Math.round(n * 1000);
    if (s.slice(-1) === 'm') return Math.round(n * 1e6);
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return null;
  }

  loadJson('https://api.github.com/repos/' + REPO)
    .then(function (data) {
      if (show(fromGithub(data))) return;
      return loadJson('https://img.shields.io/github/stars/' + REPO + '.json').then(function (shields) {
        show(fromShields(shields));
      });
    })
    .catch(function () {
      return loadJson('https://img.shields.io/github/stars/' + REPO + '.json').then(function (shields) {
        show(fromShields(shields));
      });
    })
    .catch(function () {});
})();

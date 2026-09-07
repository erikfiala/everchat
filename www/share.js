/**
 * Share trampoline for /m/{messageId}.
 * Ping the Everchat extension; on success it opens the original thread.
 * Without the extension (or if the thread cannot load), go to the homepage.
 */
(function () {
  var PING_MS = 1000;
  // Same IDs as www/.well-known/webauthn (prod key + historical).
  var EXTENSION_IDS = [
    'hnafijpegchmgpmkefjihhfpegonnjdb',
    'apoahddgobmmgdbjcphhelolagklgkil',
    'mnncloenhbfhdiaffjmmgljfjcagigaj',
  ];

  function parseMessageId() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts.length !== 2 || parts[0] !== 'm') return null;
    var id;
    try {
      id = decodeURIComponent(parts[1]);
    } catch {
      return null;
    }
    if (!id || id.length < 8 || id.length > 80) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
    return id;
  }

  function goHome() {
    location.replace('/');
  }

  function ping(messageId) {
    return new Promise(function (resolve) {
      var send = globalThis.chrome && chrome.runtime && chrome.runtime.sendMessage;
      if (typeof send !== 'function') {
        resolve(false);
        return;
      }

      var settled = false;
      var pending = EXTENSION_IDS.length;
      var timer = setTimeout(function () {
        finish(false);
      }, PING_MS);

      function finish(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      }

      function oneFailed() {
        pending -= 1;
        if (pending <= 0) finish(false);
      }

      EXTENSION_IDS.forEach(function (id) {
        try {
          chrome.runtime.sendMessage(
            id,
            { type: 'OPEN_SHARED_MESSAGE', messageId: messageId },
            function (res) {
              if (chrome.runtime.lastError) {
                oneFailed();
                return;
              }
              if (res && res.ok) finish(true);
              else oneFailed();
            },
          );
        } catch {
          oneFailed();
        }
      });
    });
  }

  var messageId = parseMessageId();
  if (!messageId) {
    goHome();
    return;
  }

  ping(messageId).then(function (ok) {
    if (!ok) goHome();
  });
})();

/**
 * BMC's iframe document is cross-origin, so we cannot style its overflow.
 * scrolling=no stops the iframe viewport from scrolling.
 */
(function () {
  function lock(iframe) {
    iframe.setAttribute('scrolling', 'no');
    iframe.scrolling = 'no';
  }

  function run() {
    var iframe = document.getElementById('bmc-iframe');
    if (iframe) lock(iframe);
  }

  run();
  new MutationObserver(run).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

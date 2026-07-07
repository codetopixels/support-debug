// Isolated-world content script: relays requests from the popup to the
// capture script running in the page's main world, and adds page-level info
// only a content script can see (URL, title, viewport).
'use strict';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'collect-debug-report') return;

  const pageInfo = {
    url: location.href,
    title: document.title,
    referrer: document.referrer,
    readyState: document.readyState,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    pageOpenedAt: performance.timeOrigin,
  };

  let settled = false;
  const finish = (capture) => {
    if (settled) return;
    settled = true;
    sendResponse({ ok: true, pageInfo, capture });
  };

  const onData = (event) => {
    document.removeEventListener('__supportDebug_data', onData);
    let parsed = null;
    try {
      parsed = JSON.parse(event.detail);
    } catch (err) {
      // Malformed reply; report page info without capture data.
    }
    finish(parsed);
  };
  document.addEventListener('__supportDebug_data', onData);
  document.dispatchEvent(new CustomEvent('__supportDebug_collect'));

  // The capture script replies synchronously during the dispatch above; this
  // timeout only fires if it isn't running on this page (e.g. blocked page).
  setTimeout(() => {
    document.removeEventListener('__supportDebug_data', onData);
    finish(null);
  }, 400);

  return true;
});

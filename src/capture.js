// Runs in the page's own JS context (world: MAIN) from document_start.
// Quietly buffers console errors/warnings, uncaught errors, unhandled promise
// rejections, failed network requests and failed resource loads, so the popup
// can collect them later. Nothing is sent anywhere; data lives in this page
// only and is discarded on navigation.
(() => {
  'use strict';
  if (window.__supportDebugCapture) return;
  window.__supportDebugCapture = true;

  const MAX_ENTRIES = 50;
  const MAX_TEXT = 2000;
  const captureStartedAt = Date.now();

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const promiseRejections = [];
  const networkFailures = [];
  const resourceErrors = [];

  const push = (list, text) => {
    list.push({ time: Date.now(), text: String(text).slice(0, MAX_TEXT) });
    if (list.length > MAX_ENTRIES) list.shift();
  };

  const describe = (value) => {
    try {
      if (value instanceof Error) {
        const stack = typeof value.stack === 'string'
          ? value.stack.split('\n').slice(0, 6).join('\n')
          : '';
        return stack.includes(value.message) ? stack : `${value.name}: ${value.message}\n${stack}`;
      }
      if (typeof value === 'string') return value;
      if (value instanceof Element) return `<${value.tagName.toLowerCase()}>`;
      return JSON.stringify(value, (key, v) => (typeof v === 'bigint' ? String(v) : v));
    } catch (err) {
      try {
        return String(value);
      } catch (err2) {
        return '[unserialisable value]';
      }
    }
  };

  const formatArgs = (args) => Array.from(args).map(describe).join(' ');

  const hookConsole = (method, list) => {
    const original = console[method];
    console[method] = function (...args) {
      try {
        push(list, formatArgs(args));
      } catch (err) {
        // Never let capture break the page's own logging.
      }
      return original.apply(this, args);
    };
  };
  hookConsole('error', consoleErrors);
  hookConsole('warn', consoleWarnings);

  // Capture phase so we also see resource load failures (img/script/link),
  // which don't bubble.
  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target && target !== window && target.tagName) {
      const url = target.src || target.href || '(no url)';
      push(resourceErrors, `<${target.tagName.toLowerCase()}> failed to load: ${url}`);
      return;
    }
    const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
    push(pageErrors, (event.error ? describe(event.error) : String(event.message)) + where);
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    push(promiseRejections, describe(event.reason));
  });

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (...args) {
      const started = Date.now();
      let method = 'GET';
      let url = '';
      try {
        const input = args[0];
        url = typeof input === 'string' ? input : (input && input.url) || String(input);
        method = ((args[1] && args[1].method) || (input && input.method) || 'GET').toUpperCase();
      } catch (err) {
        // Descriptive info only; never block the request.
      }
      return originalFetch.apply(this, args).then(
        (response) => {
          if (response && response.status >= 400) {
            push(networkFailures, `${method} ${url} -> ${response.status} ${response.statusText} (${Date.now() - started}ms)`);
          }
          return response;
        },
        (err) => {
          if (!(err && err.name === 'AbortError')) {
            push(networkFailures, `${method} ${url} -> network failure: ${describe(err)} (${Date.now() - started}ms)`);
          }
          throw err;
        }
      );
    };
  }

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__supportDebugMeta = { method: String(method).toUpperCase(), url: String(url) };
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const meta = this.__supportDebugMeta;
    if (meta) {
      const started = Date.now();
      let aborted = false;
      this.addEventListener('abort', () => { aborted = true; });
      this.addEventListener('loadend', () => {
        if (aborted) return;
        if (this.status === 0 || this.status >= 400) {
          const outcome = this.status === 0 ? 'network failure' : `${this.status} ${this.statusText}`;
          push(networkFailures, `${meta.method} ${meta.url} -> ${outcome} (${Date.now() - started}ms)`);
        }
      });
    }
    return xhrSend.apply(this, args);
  };

  // The extension's bridge content script (isolated world) asks for the buffer
  // via a DOM event; reply the same way. detail is a JSON string because
  // objects don't reliably cross world boundaries.
  document.addEventListener('__supportDebug_collect', () => {
    const payload = {
      capturing: true,
      captureStartedAt,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      promiseRejections,
      networkFailures,
      resourceErrors,
    };
    document.dispatchEvent(new CustomEvent('__supportDebug_data', {
      detail: JSON.stringify(payload),
    }));
  });
})();

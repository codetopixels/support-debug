'use strict';

const REPORT_LIST_LIMIT = 20;

const el = (id) => document.getElementById(id);

function setStatus(icon, title, detail) {
  el('status-icon').textContent = icon;
  el('status-title').textContent = title;
  el('status-detail').textContent = detail || '';
}

function formatTime(ms) {
  return new Date(ms).toTimeString().slice(0, 8);
}

function parseBrowserFromUA(ua) {
  const rules = [
    [/Edg\/([\d.]+)/, 'Microsoft Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Unknown browser';
}

async function browserInfo() {
  const info = {
    browser: parseBrowserFromUA(navigator.userAgent),
    os: navigator.platform || 'unknown',
    userAgent: navigator.userAgent,
    languages: (navigator.languages || [navigator.language]).join(', '),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}`,
    cpuCores: navigator.hardwareConcurrency || 'unknown',
    deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB (approx)` : 'unknown',
    cookiesEnabled: navigator.cookieEnabled ? 'yes' : 'no',
    online: navigator.onLine ? 'yes' : 'no',
  };
  try {
    if (navigator.userAgentData) {
      const high = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platform', 'platformVersion']);
      const brand = (high.fullVersionList || []).find((b) => !/Not.*Brand/i.test(b.brand) && b.brand !== 'Chromium');
      if (brand) info.browser = `${brand.brand} ${brand.version}`;
      if (high.platform) info.os = `${high.platform} ${high.platformVersion || ''}`.trim();
    }
  } catch (err) {
    // High-entropy hints unavailable; the user-agent fallback above stands.
  }
  return info;
}

function section(title, entries, lines) {
  const out = [`--- ${title} (${entries.length}) ---`];
  if (!entries.length) {
    out.push('(none)');
  } else {
    const shown = entries.slice(-REPORT_LIST_LIMIT);
    if (shown.length < entries.length) {
      out.push(`(showing the last ${shown.length} of ${entries.length})`);
    }
    for (const entry of shown) {
      out.push(`[${formatTime(entry.time)}] ${entry.text}`);
    }
  }
  lines.push(out.join('\n'), '');
}

function buildReport({ pageInfo, capture, browser, pageAccessNote }) {
  const lines = [];
  const now = new Date();
  lines.push('=== Debug report for support ===');
  lines.push(`Generated: ${now.toISOString()} (local: ${now.toString()})`);
  lines.push(`Extension version: ${chrome.runtime.getManifest().version}`);
  lines.push('');

  lines.push('--- Page ---');
  if (pageInfo) {
    lines.push(`URL: ${pageInfo.url}`);
    lines.push(`Title: ${pageInfo.title || '(none)'}`);
    if (pageInfo.referrer) lines.push(`Came from: ${pageInfo.referrer}`);
    lines.push(`Page opened at: ${new Date(pageInfo.pageOpenedAt).toISOString()}`);
    lines.push(`Window size: ${pageInfo.viewportWidth}x${pageInfo.viewportHeight} (pixel ratio ${pageInfo.devicePixelRatio})`);
  } else {
    lines.push('(no page information available)');
  }
  if (pageAccessNote) lines.push(`Note: ${pageAccessNote}`);
  lines.push('');

  lines.push('--- Browser & system ---');
  lines.push(`Browser: ${browser.browser}`);
  lines.push(`Operating system: ${browser.os}`);
  lines.push(`Screen: ${browser.screen}`);
  lines.push(`Language(s): ${browser.languages}`);
  lines.push(`Timezone: ${browser.timezone}`);
  lines.push(`CPU cores: ${browser.cpuCores}, memory: ${browser.deviceMemory}`);
  lines.push(`Cookies enabled: ${browser.cookiesEnabled}, online: ${browser.online}`);
  lines.push(`Full user agent: ${browser.userAgent}`);
  lines.push('');

  if (capture) {
    lines.push(`Recording on this page since: ${new Date(capture.captureStartedAt).toISOString()}`);
    lines.push('');
    section('Console errors', capture.consoleErrors, lines);
    section('Uncaught page errors', capture.pageErrors, lines);
    section('Unhandled promise rejections', capture.promiseRejections, lines);
    section('Failed network requests', capture.networkFailures, lines);
    section('Failed resource loads (images, scripts...)', capture.resourceErrors, lines);
    section('Console warnings', capture.consoleWarnings, lines);
  } else {
    lines.push('--- Errors ---');
    lines.push('(error recording was not active on this page — see note above)');
    lines.push('');
  }

  lines.push('=== End of report ===');
  return lines.join('\n');
}

function captureSummary(capture) {
  const items = [
    [capture.consoleErrors.length + capture.pageErrors.length + capture.promiseRejections.length, 'error'],
    [capture.networkFailures.length, 'failed network request'],
    [capture.resourceErrors.length, 'failed resource load'],
    [capture.consoleWarnings.length, 'warning'],
  ];
  const parts = items
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? '' : 's'}`);
  return parts.length ? `Captured on this page: ${parts.join(', ')}.` : 'No errors were captured on this page.';
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const area = el('report-text');
    area.value = text;
    el('report-details').classList.remove('hidden');
    el('report-details').open = true;
    area.select();
    try {
      return document.execCommand('copy');
    } catch (err2) {
      return false;
    }
  }
}

function collectFromTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'collect-debug-report' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function main() {
  const browser = await browserInfo();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = tab && tab.id != null ? await collectFromTab(tab.id) : null;

  let pageInfo = response ? response.pageInfo : null;
  let capture = response ? response.capture : null;
  let pageAccessNote = '';
  if (!response) {
    pageAccessNote = 'The extension could not read this page. This happens on browser pages (settings, new tab) '
      + 'or on pages that were already open when the extension was installed — refresh the page, make the '
      + 'problem happen again, then click the icon again.';
    if (tab && tab.url) {
      pageInfo = {
        url: tab.url,
        title: tab.title || '',
        referrer: '',
        readyState: 'unknown',
        viewportWidth: tab.width || 0,
        viewportHeight: tab.height || 0,
        devicePixelRatio: 1,
        pageOpenedAt: Date.now(),
      };
    }
  }

  const report = buildReport({ pageInfo, capture, browser, pageAccessNote });
  el('report-text').value = report;
  el('report-details').classList.remove('hidden');

  const summaryBox = el('summary');
  if (capture) {
    summaryBox.textContent = captureSummary(capture);
  } else {
    summaryBox.textContent = 'Heads up: errors on this page could not be read. '
      + 'Refresh the page, make the problem happen again, then click this icon again.';
  }
  summaryBox.classList.remove('hidden');

  const copied = await copyText(report);
  if (copied) {
    setStatus('✅', 'Copied to your clipboard!', 'Paste it into your message to support (Ctrl+V, or ⌘V on Mac).');
  } else {
    setStatus('⚠️', 'Automatic copy failed', 'Select the text below and copy it manually (Ctrl+C / ⌘C).');
  }

  const btn = el('copy-btn');
  btn.classList.remove('hidden');
  btn.addEventListener('click', async () => {
    const ok = await copyText(report);
    if (ok) setStatus('✅', 'Copied to your clipboard!', 'Paste it into your message to support (Ctrl+V, or ⌘V on Mac).');
  });
}

main().catch((err) => {
  setStatus('⚠️', 'Something went wrong', String(err && err.message ? err.message : err));
});

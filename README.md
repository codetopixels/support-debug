# Support Debug Report

A Chrome extension for non-technical users. One click on the toolbar icon copies a
debug report to the clipboard, ready to paste into an email or chat with support.

The report contains:

- **Errors from the page** — console errors and warnings, uncaught JavaScript
  errors, unhandled promise rejections, failed network requests (status 400+ or
  connection failures), and failed resource loads (images/scripts that didn't load).
- **Browser and system details** — browser name and version, operating system,
  screen and window size, language, timezone, cookies enabled, online status.
- **Page details** — the page URL and title, and when the page was opened.

Nothing is sent anywhere. The extension has no server; the report only goes to the
user's clipboard, and error buffers are discarded when they leave the page.

## Installing (for users)

Until it's published on the Chrome Web Store, install it from a zip:

1. Download and unzip the extension folder you were sent (remember where it is —
   don't delete it afterwards; Chrome keeps using it from that spot).
2. In Chrome, open `chrome://extensions` (copy that into the address bar).
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and choose the unzipped folder (the one containing
   `manifest.json`).
5. Optional: click the puzzle-piece icon next to the address bar and pin
   **Support Debug Report** so its blue icon is always visible.

Works the same in Microsoft Edge (`edge://extensions`).

## Using it

1. When something goes wrong on a page, click the blue ring icon in the toolbar.
2. It says **"Copied to your clipboard!"** — that's it.
3. Paste (Ctrl+V, or ⌘V on Mac) into your reply to support.

If the popup says errors couldn't be read (browser pages, or tabs opened before
the extension was installed): refresh the page, make the problem happen again,
then click the icon again.

> The extension only records errors that happen **while it's installed and the
> page is open**. If the problem happened before installing, reload the page and
> reproduce it once.

## For developers

```
manifest.json     Manifest V3, Chrome 111+
src/capture.js    Runs in the page's main world at document_start; buffers
                  console errors/warnings, uncaught errors, rejections, failed
                  fetch/XHR requests, and resource load failures (max 50 each).
src/bridge.js     Isolated-world content script; relays the buffer to the popup
                  and adds page info (URL, title, viewport).
src/popup.html/.js  Auto-collects, builds the plain-text report, auto-copies.
test/test-page.html Manual/automated test page that triggers one of everything.
```

To test locally: load the repo folder itself as an unpacked extension, open any
website, click the icon.

To package for distribution:

```bash
zip -r support-debug-report.zip manifest.json icons src
```

Upload that zip to the Chrome Web Store developer dashboard, or send it to users
with the install steps above.

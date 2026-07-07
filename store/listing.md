# Chrome Web Store listing — copy-paste text

## Basics

- **Name:** Support Debug Report
- **Category:** Tools (Developer Tools also fits; Tools reads better for end users)
- **Language:** English

## Short description (summary)

> One click copies console errors and browser details to your clipboard, ready
> to paste into a support message.

## Detailed description

> When something goes wrong on a website, support teams always ask the same
> questions: What browser are you on? What does the error say? Can you open the
> developer console?
>
> Support Debug Report answers all of that with one click. Click the icon and a
> plain-text report is copied to your clipboard, ready to paste into an email
> or chat with any support team.
>
> The report includes:
> • Errors from the page — console errors and warnings, uncaught JavaScript
> errors, failed network requests, and images or scripts that didn't load
> • Browser and system details — browser name and version, operating system,
> screen and window size, language, and timezone
> • The page address and title
>
> Private by design: the extension has no server and sends nothing anywhere.
> The report only goes to your clipboard, and you can review exactly what was
> copied before pasting it. Error records live only in the page's memory and
> are discarded when you leave the page.
>
> Made for non-technical users: no setup, no options, one click.

## Privacy tab answers

- **Single purpose description:** Copies a technical debug report (page errors
  and browser details) to the user's clipboard so they can share it with a
  support team.
- **Data usage:** the extension does NOT collect or transmit any user data.
  Tick nothing in the data-collection checklist; certify the disclosures.
- **Privacy policy URL:** host `store/privacy-policy.md` publicly and paste its
  URL (see below).

## Permission justifications

- **Host permission (`http://*/*`, `https://*/*` via content scripts):**
  > The extension records console errors and failed network requests at the
  > moment they happen, so a user can report a problem on any website. Errors
  > cannot be read retroactively, so the capture script must already be running
  > on the page before the problem occurs. No data is collected or transmitted;
  > the report is only copied to the user's clipboard.
- **activeTab:**
  > Used to identify the tab the user is reporting a problem from, and to read
  > its URL for the report when the content script is unavailable.
- **clipboardWrite:**
  > The extension's single function: copying the debug report to the clipboard
  > when the user clicks the icon.

## Assets still needed from you

- **Screenshot (required, 1280×800 or 640×400):** open the test page, trigger a
  couple of errors, click the icon, screenshot the popup over the page.
- **Promo tile (optional, 440×280):** skip it; only needed if you want featuring.

## Hosting the privacy policy

Any public URL works. Easiest options:

1. Push this repo to GitHub (public) and use the file's github.com URL.
2. Or create a public GitHub Gist with the policy text and use the gist URL.

## Visibility

Recommend **Unlisted**: installable by anyone with the link, auto-updates, but
not searchable in the store. Switch to Public any time without re-review.

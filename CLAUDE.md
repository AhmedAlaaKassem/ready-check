# Ready Check

A personal iPhone checklist app, installed as a PWA (Add to Home Screen from Safari).
One user (me). No App Store, no account, no backend, no sync. All data lives on the phone.

The core moment: I'm about to leave for the gym (or training, or a trip). I open the app,
pick a checklist, and tick items one by one. Each ticked item gets a strikethrough and
slides down to a "Checked" section. When everything is ticked, the screen says **Ready to go**.

`reference/draft.html` is the approved design and behavior. Treat it as the spec for look
and feel. It was written as a preview snippet (no `<html>`/`<head>`, Google Fonts from a CDN),
so it is a reference, not production code.

## Hard requirements

- **Works fully offline** after the first load. Service worker precaches every file.
  No runtime requests to any CDN. Self-host the fonts (Barlow Condensed 600/700,
  Figtree 400/500/600) as woff2 files in the repo.
- **Installable on iOS**: `manifest.json` (display: standalone), `apple-touch-icon` (180×180 PNG),
  `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `black-translucent`,
  `viewport-fit=cover`, and safe-area padding so nothing sits under the notch or home bar.
- **Local data only**: store in `localStorage` (or IndexedDB if it gets bigger).
  Call `navigator.storage.persist()` when it's available. Version the data format (`schemaVersion`)
  so future features can migrate old data without losing it.
- **Backup/restore**: Settings screen with "Export backup" (downloads a `.json` file via the share sheet / download)
  and "Import backup" (file picker, validates, then replaces data after an in-page confirm).
  Deleting the app from the Home Screen wipes its data, so this matters.
- **No build step to start.** Plain HTML/CSS/JS (ES modules are fine). Keep it simple enough
  that deploying = copying static files. If a build step ever becomes worth it, ask first.
- Light and dark mode follow the system setting. Respect `prefers-reduced-motion`.
- Tap targets ≥ 44px. Feels native: no text selection on tap rows, no rubber-band glitches,
  no 300ms delays, no zoom on input focus (inputs ≥ 16px font).

## Behavior (from the draft, keep all of it)

- Home: list of checklists as cards with name, `done / total`, a progress bar, and a "Ready" chip when complete.
  "+ New checklist" creates one and opens it with the add-item field focused.
- Checklist screen: big condensed title, large `done / total` counter, segmented progress bar.
  Unticked items on top, then an "Add item" row, then a "Checked" divider and ticked items
  (in the order they were ticked).
- Tapping a row toggles it. The strikethrough draws across, the circle fills green with a check,
  and the row glides to its new position (FLIP animation). Tapping a checked row unticks it.
- All ticked → green "Ready to go" panel with "Reset for next time" (unticks everything).
  Partial progress → "Uncheck all" button at the bottom.
- Edit mode: rename the checklist, rename items inline, delete items, delete the checklist
  (in-page confirm, never `window.confirm`).
- Seed data on first launch only: Gym bag, Table tennis training, Leaving the house.

## Improvements to add in v1

- Light haptic-style feedback isn't available to PWAs on iOS, so make the tick animation feel
  satisfying instead (it already does; don't remove it).
- Reorder items in edit mode (drag handle, touch-friendly).
- Remember which checklist was last open.
- Optional: auto-reset a checklist if it was completed more than N hours ago (setting per list, default off).

## Later (don't build yet, but don't paint the data model into a corner)

Reminders/notifications, calendar, profiles (e.g. "Gym" vs "Travel" groups of lists), notes per list.
Note: iOS PWAs can only get push notifications via Web Push, which needs a server. If local
scheduled reminders become essential, this app moves to native SwiftUI. Keep the data model
plain JSON so it can be ported.

## Hosting

Static hosting over HTTPS (required for service workers). Options, simplest first:
1. GitHub Pages from this repo.
2. A static path on my own server.
Add a short `README.md` with deploy steps and the iPhone install steps
(Safari → Share → Add to Home Screen).

## Done means

- Lighthouse PWA/installability checks pass; airplane mode on the phone still opens the app and saves ticks.
- Service worker has a cache version string; bumping it ships an update (app picks it up on next launch).
- Tested at 375px and 430px wide, light and dark.

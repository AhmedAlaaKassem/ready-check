# Ready Check

A personal offline checklist app for iPhone, installed from Safari as a Home Screen web app.
Plain HTML/CSS/JS with no build step: deploying means copying the static files.

## Project layout

```
index.html          app shell + iOS meta tags
styles.css          all styles (ported from reference/draft.html)
manifest.json       PWA manifest
sw.js               service worker: VERSION + list of precached files
js/app.js           boot, view state, event wiring
js/store.js         data model, schemaVersion + migrations, seed, auto-reset
js/views.js         screen markup (home, checklist, settings)
js/flip.js          the glide animation when a row is ticked
js/reorder.js       drag-to-reorder in edit mode
js/backup.js        export / import
fonts/              Barlow Condensed 600/700, Figtree (variable 400–600) + OFL licenses
icons/              icon.svg sources and the rendered PNGs
tools/              render-icons.sh (only needed if you change the icon)
reference/          the original approved draft
```

## Run locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123. Service workers run on `localhost` without HTTPS.
To test offline, load the page once, stop the server and reload.

## Deploy to GitHub Pages

1. Create an empty repository on GitHub, for example `ready-check`.
2. Push this folder to it:

   ```bash
   git add -A
   git commit -m "Ready Check v1"
   git branch -M main
   git remote add origin https://github.com/<your-user>/ready-check.git
   git push -u origin main
   ```

3. On GitHub, go to **Settings → Pages**. Under **Build and deployment**, choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the app is live at `https://<your-user>.github.io/ready-check/`.
   All paths are relative, so it works under the `/ready-check/` sub-path.

The same files work on any static HTTPS host, such as a folder on your own server.

## Ship an update

1. Change the files.
2. If you added a new file the app loads, add it to `FILES` in `sw.js`.
3. **Bump `VERSION` in `sw.js`** (for example `1.0.0` → `1.0.1`). Without this, phones keep the old cached files.
4. Commit and push.

On the phone, the next launch downloads the new version in the background, and the launch after that runs it.
To force it, close the app from the app switcher and open it twice.
Settings → About shows the version that's installed.

## Install on iPhone

1. Open the GitHub Pages URL in **Safari**. Installing only works from Safari's share sheet.
2. Tap **Share** (the square with the arrow), then **Add to Home Screen**.
   If you see an **Open as Web App** switch, leave it on.
3. Tap **Add**. Ready Check now has its own icon and opens full-screen, without Safari's toolbars.
4. Open it once while online so everything is cached. After that it works in airplane mode.

## Your data and backups

- Checklists are stored only on the phone (in the app's `localStorage`). There is no account and no sync.
- **Removing the app from the Home Screen deletes its data.** Before doing that, or before
  switching phones, open **Settings → Export backup**. This opens the share sheet; choose
  **Save to Files** (iCloud Drive is a good place).
- **Import backup** reads that `.json` file, checks it, and asks before replacing anything.
- The data format carries a `schemaVersion`. Later versions migrate old data and old backups on load.

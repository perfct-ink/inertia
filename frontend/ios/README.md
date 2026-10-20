# iOS app (Capacitor)

A thin native shell bundling the same webpack build the web app and Electron
app already use — see `frontend/capacitor.config.ts`. No separate iOS
codebase to maintain: fix a bug or ship a feature once in `frontend/src`,
then rebuild and re-sync here.

## Building

```bash
cd frontend
npm run build            # sets API_URL/COLLAB_URL — see below
npx cap sync ios         # copies dist/ into ios/App/App/public, updates deps
npx cap open ios         # opens the Xcode project
```

`npx cap copy ios` is a faster alternative to `sync` when you haven't added
a Capacitor plugin — it skips the native dependency-resolution step.

### Two build targets

`API_URL`/`COLLAB_URL` are baked into the bundle at build time (see
`webpack.config.js`'s `DefinePlugin` block) — same mechanism the deployed
web build and Electron already use. Which one you want depends on what
you're doing:

- **Against the deployed API** (what should actually ship):
  ```bash
  API_URL=https://inertia.it.com COLLAB_URL=wss://inertia.it.com/collab npm run build
  ```
- **Against your local dev stack** (`docker compose up` running):
  - iOS **Simulator** shares the host's network, so `http://localhost:3000`
    works directly:
    ```bash
    API_URL=http://localhost:3000 COLLAB_URL=ws://localhost:1234 npm run build
    ```
  - A **real device** can't reach `localhost` (that's the phone's own
    loopback) — use your Mac's LAN IP instead, and make sure your phone is
    on the same Wi-Fi:
    ```bash
    API_URL=http://<your-mac-lan-ip>:3000 COLLAB_URL=ws://<your-mac-lan-ip>:1234 npm run build
    ```
    Add that origin to `docker-compose.yml`'s backend `CORS_ORIGINS` too,
    e.g. `http://192.168.1.23:5174,capacitor://localhost` (comma-separated,
    read by `backend/config/initializers/cors.rb`) and recreate the backend
    container (`docker compose up -d --force-recreate --no-deps backend`).

Either way, the app's own origin is `capacitor://localhost` — already
allowed in `docker-compose.yml` (dev) and `docker-compose.coolify.yml`
(prod, the default `CORS_ORIGINS`).

## Signing (one-time, per Mac)

This first pass targets free Apple-ID "Personal Team" signing — no paid
Developer Program needed to run on your own iPhone:

1. Xcode → Settings → Accounts → add your Apple ID.
2. Open the project (`npx cap open ios`), select the **App** target →
   Signing & Capabilities → set Team to your name ("Personal Team").
3. Plug in your iPhone, select it as the run destination, hit Run.
4. First launch: on the iPhone, Settings → General → VPN & Device
   Management → trust the developer certificate.
5. Personal-Team-signed apps expire after ~7 days — re-run from Xcode to
   refresh.

## Regenerating the icon/splash screen

Source image lives at `frontend/assets/icon.png` (same art as
`frontend/electron/icon.png`). Regenerate via:

```bash
npx capacitor-assets generate --ios --iconBackgroundColor '#12352f' --splashBackgroundColor '#12352f'
```

## What's committed vs. generated

`ios/App/App/public` (the copied web build) and `ios/App/App/Pods` are
gitignored (see `ios/.gitignore`, Capacitor's own default) — everything
else under `ios/`, including the Xcode project itself, is committed, the
same way `frontend/electron/` is.

import type { CapacitorConfig } from '@capacitor/cli'

// Bundles the same webpack build (`dist/`) Electron already packages via
// `win.loadFile` — the WKWebView loads it locally under the capacitor://
// scheme rather than file://, which is why backend/config/initializers/
// cors.rb's CORS_ORIGINS needs that origin added (see docker-compose.yml /
// docker-compose.coolify.yml). appId matches frontend/package.json's Electron
// `build.appId` for consistency across the two native shells.
const config: CapacitorConfig = {
  appId: 'com.inertia.app',
  appName: 'Inertia',
  webDir: 'dist',
}

export default config

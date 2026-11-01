// Which router the app runs on, and what to do with URLs from before clean
// URLs. Pure so both can be tested without a browser; the window is only
// read through default arguments.

export type RouterKind = 'browser' | 'hash'

interface Platform {
  protocol: string
  // True inside the Capacitor shell, whatever scheme it serves the bundle from.
  capacitorNative?: boolean
}

interface PlatformWindow {
  location: { protocol: string }
  Capacitor?: { isNativePlatform?: () => boolean }
}

interface LegacyWindow extends PlatformWindow {
  location: { protocol: string; pathname: string; hash: string }
  history: { replaceState: (data: unknown, unused: string, url: string) => void }
}

// Pages served over http(s) get index.html back for any path (nginx, the
// webpack dev server), so real paths work. Electron (file://) and the
// Capacitor iOS app (capacitor://) load index.html off disk, where a path
// has nothing to resolve, so they keep the hash router.
export function routerKind({ protocol, capacitorNative = false }: Platform): RouterKind {
  if (capacitorNative) return 'hash'
  return protocol === 'http:' || protocol === 'https:' ? 'browser' : 'hash'
}

export function detectRouterKind(win: PlatformWindow = window): RouterKind {
  return routerKind({
    protocol: win.location.protocol,
    capacitorNative: win.Capacitor?.isNativePlatform?.() === true,
  })
}

// An absolute path on this site: one leading slash, never "//host" or "/\host"
// (which browsers treat as another site), and no whitespace or backslashes.
const SITE_PATH = /^\/(?![/\\])[^\s\\]*$/

// Where an old-style URL should go, or null when the URL is already current.
// Before clean URLs the web app lived at "/#/route" (and "/index.html#/route"),
// so bookmarks and shared links carry the route in the hash. A bare
// "/index.html" becomes "/". The marketing layout
// (backend/app/views/layouts/marketing.html.erb) applies the same rule for
// "/#/..." links that reach Rails first.
export function legacyUrlTarget({ pathname, hash }: { pathname: string; hash: string }): string | null {
  if (pathname !== '/' && pathname !== '/index.html') return null
  if (hash.startsWith('#/')) {
    const target = hash.slice(1)
    if (SITE_PATH.test(target)) return target
  }
  return pathname === '/index.html' ? '/' : null
}

// Rewrites the address bar once, before the router reads it. The hash-router
// shells are left alone: there the hash is the route.
export function redirectLegacyUrl(win: LegacyWindow = window): string | null {
  if (detectRouterKind(win) !== 'browser') return null
  const target = legacyUrlTarget(win.location)
  if (target) win.history.replaceState(null, '', target)
  return target
}

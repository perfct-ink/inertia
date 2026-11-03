// Web URLs are plain paths (`/space`, `/login`). Only shells that load the
// bundle without a server to resolve paths keep a hash router: Electron
// (file://), the Capacitor iOS app (capacitor://) and the native Mac shell,
// whose WKWebView only allows its `/index.html` entry.
type Place = Pick<Location, 'protocol' | 'pathname' | 'search' | 'hash'>

export function usesHashRouter(place: Place, nativeShell: boolean): boolean {
  return nativeShell || !/^https?:$/.test(place.protocol)
}

// The clean path for an old-style web URL (`/#/space`, `/index.html#/space`,
// `/index.html`), or null when the URL is already clean. In-page anchors such
// as `#heading-id` are left alone.
export function cleanPath(place: Place): string | null {
  if (place.hash.startsWith('#/')) return place.hash.slice(1)
  if (place.pathname === '/index.html') return `/${place.search}${place.hash}`
  return null
}

// Which shell the web app is running in. The packaged Electron app says so in
// its user agent; the native Mac shell registers the inertiaSession message
// handler on its WKWebView before the page loads.
export const isElectron = navigator.userAgent.toLowerCase().includes('electron')

export const isMacShell = Boolean((window as { webkit?: { messageHandlers?: { inertiaSession?: unknown } } }).webkit?.messageHandlers?.inertiaSession)

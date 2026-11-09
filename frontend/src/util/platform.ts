// Which shell the web app is running in. The packaged Electron app says so in
// its user agent; the native Mac shell registers the inertiaSession message
// handler on its WKWebView before the page loads.
export const isElectron = navigator.userAgent.toLowerCase().includes('electron')

export const isMacShell = Boolean((window as { webkit?: { messageHandlers?: { inertiaSession?: unknown } } }).webkit?.messageHandlers?.inertiaSession)

// A Mac, iPhone or iPad: where keyboard shortcuts read ⌘ instead of Ctrl. Windows and Linux
// read the same shortcuts as Ctrl (util/keyLabel.ts).
export const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

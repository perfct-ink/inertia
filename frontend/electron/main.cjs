const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

// app.getName()/app.name (used below for the menu bar's App menu label,
// and elsewhere by Electron internally) reads package.json's lowercase
// "name" field ("inertia") unless overridden — that's a different layer
// from the CFBundleName/CFBundleDisplayName Info.plist patch in
// scripts/brand-electron-dev.sh, which only covers Finder/Dock/Cmd+Tab
// naming, not anything Electron itself reads at the JS level. Must be set
// before anything (the menu, in particular) reads app.name.
app.setName('Inertia')

// Electron's built-in default macOS menu (used automatically whenever
// Menu.setApplicationMenu is never called) binds Cmd+W to a native
// "Close Window" accelerator via the Window menu's `role: 'close'` item.
// That fires at the native menu layer, not through the page's DOM, so a
// renderer-side keydown handler's preventDefault() can't stop it — Cmd+W
// closes the whole window regardless. This template is Electron's own
// documented "reconstruct the mac default" example, minus that one Close
// item, so Cmd+W is left free for the renderer to use for closing the
// active tab instead, while Cmd+C/V/X/Z/A, Cmd+Q, Cmd+M, etc. still work.
function buildAppMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]
  return Menu.buildFromTemplate(template)
}

// Kept alongside main.cjs (rather than referencing src/assets/logo.png)
// so it's present both in dev (running from the repo) and in the packaged
// app (package.json only bundles dist/**/* and electron/**/*).
const iconPath = path.join(__dirname, 'icon.png')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // This window must only ever show the local bundled app (or, in dev, the
  // webpack dev server) — never a real network page. Without this, any
  // stray navigation (a missed link, a redirect bug) could land on the real
  // production site, including its server-rendered marketing pages at "/"
  // (see backend/app/controllers/marketing_controller.rb) — exactly what a
  // packaged native window must never show. will-navigate doesn't fire for
  // React Router's history-API-based in-app routing, only real top-level
  // navigations, so this doesn't interfere with normal use.
  const allowedOrigin = process.env.ELECTRON_DEV_SERVER_URL
    ? new URL(process.env.ELECTRON_DEV_SERVER_URL).origin
    : 'file://'
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(allowedOrigin)) return
    event.preventDefault()
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_DEV_SERVER_URL) {
    win.loadURL(process.env.ELECTRON_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  // BrowserWindow's `icon` option isn't used for the Dock icon on macOS in
  // dev mode (only the packaged app's .icns is) — app.dock.setIcon covers it.
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath)
    Menu.setApplicationMenu(buildAppMenu())
  }

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

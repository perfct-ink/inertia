# Native Inertia for macOS

First stage of the gradual SwiftUI migration, requiring macOS 14+ and Xcode's Swift toolchain.

- `make dev-native-mac` builds and opens `macos/dist/Inertia.app`.
- `make test-native-mac` runs the native regression tests.
- Open `macos/Package.swift` in Xcode to debug, or `swift run --package-path macos`.

The native app provides sign-in, nested project navigation, project document lists and dashboards, task creation/completion, and an event agenda with event creation. Documents and spreadsheets use the existing web editors in an isolated WKWebView. The web frontend must include the `native=1` layout support to hide its duplicate sidebar. Existing Electron targets remain available.

Production endpoints default to https://inertia.it.com. For development run:

```
INERTIA_API_URL=http://localhost:3000 INERTIA_WEB_URL=http://localhost:5174 swift run --package-path macos
```

Credentials are never saved to disk by the native app. Sessions are held in memory, with an ephemeral WebView data store; sign-in is required after relaunch. The bearer token is injected only into the configured web origin, never placed in a URL. External web links open in the default browser. The app needs a network connection; offline editing and conflict resolution are not implemented.

This is a first native slice, not full Electron parity: Workboard, Gantt, full task editing, file syncing, persistent Keychain login, and native rich text/spreadsheet editors are future stages. The calendar currently uses a native agenda list. Distribution signing/notarization is not configured; builds are ad-hoc signed for local use.

# Choosing Cloud or Local Storage (Mac app)

## What it does
The first time the native Mac app starts it shows two cards: **Cloud Storage** (sign in to an inertia.it.com account; the Space lives on the server) and **Local Storage** (a folder in iCloud Drive; no account). The choice is remembered (`UserDefaults`, key `inertia.storage`) and the cards are not shown again until **Change storage** on the Local Storage screen puts the choice back to "not chosen".
- **Cloud** goes on to the existing sign-up / sign-in screens and then the online workspace in `WorkspaceWebView`, exactly as before.
- **Local** creates `~/Library/Mobile Documents/com~apple~CloudDocs/Inertia` (iCloud Drive's `Inertia` folder). If iCloud Drive is off (its folder is missing) nothing is created and the error alert says to turn it on; the person stays on the cards. A returning Local person whose folder can't be made is asked again. The Local screen shows the folder path, **Show in Finder** and **Change storage**.
- **Not built:** Local Storage does not hold documents, sheets or tasks yet. Task files (File > New Task File) work as before. The rest is `docs/backlog/local-storage-in-icloud.md`.
- Mac app only: the web app, Electron and iOS are unchanged.

## API and models
None. `InertiaCore/StorageChoice.swift` (`StorageChoice`, `LocalStorage`, `StoragePreference`), `Session.storage` / `choose` / `changeStorage`, and `Components/Screens/StorageChoiceView.swift`, `LocalStorageView.swift`, switched in `RootView`.

## Who can view and change
The person at the Mac. Nothing leaves the Mac for this choice.

## Tests
`macos/Tests/InertiaCoreTests/StorageChoiceTests.swift` (the two choices, remembering and clearing, an unknown stored value, the folder path, creating the folder only when iCloud Drive exists).

## Known limits
- Not run: `swift test` and the app. `InertiaCore` type-checks and an ad-hoc harness of the same logic passed; the SwiftUI screens were only syntax-checked.
- The cards were not seen, in light or dark, nor the hover state.
- The folder path assumes an unsandboxed app (`homeDirectoryForCurrentUser`); a sandboxed or differently signed build would need iCloud entitlements.
- People who already use the app are asked once on their next launch; their existing sign-in is kept if they choose Cloud.

## History
- 2026-11-10: first slice on branch `backlog/choose-cloud-or-local-storage` (not merged or deployed).

---
priority: p1
depends_on: []
components: [macos]
branch: backlog/choose-cloud-or-local-storage
status: incomplete
---
# Local Storage in iCloud Drive: documents, spreadsheets and tasks without an account

## Objective

Alex (2026-11-10): "When starting Inertia, ask with two cards if the user wants Cloud Storage or Local Storage. Cloud Storage uses the inertia.it.com API. Local storage uses a folder iCloud." Mac app only (Alex's answer). The two cards, the remembered choice and the iCloud Drive folder are built. This task is what Local Storage does once chosen.

## Requirements

- In Local mode the Mac app works with no account and no network: create, open, edit and delete documents, spreadsheets, Collections and tasks, stored as files in `iCloud Drive/Inertia/` (the folder `LocalStorage.folder(home:)` returns).
- Decide the file formats (Markdown or the editor's JSON for documents, CSV or JSON for sheets and Collections, the existing `.inertia` task files for tasks) and the folder layout (a project is a directory), so the files stay usable outside the app.
- Decide how the existing React workspace runs against files: a local server in the app that answers the same API from the folder, or a second data layer in the web app. The Mac shell must keep loading `WorkspaceLayout.tsx` and the shared sidebar (docs/rules/ui-organization.md), not a second layout.
- iCloud conflicts (two Macs edit one file): iCloud makes "conflicted copies"; show them to the person rather than picking silently.
- Switching storage later: say what happens to the files already in the other place (nothing is deleted or moved without asking).
- Unsigned or sandboxed builds can lose access to iCloud Drive: say how the app is signed for it.

## Acceptance criteria

- Chosen Local, a person can make a document, quit, reopen and find it, and the file is in the iCloud Drive folder.
- Offline, nothing shows a failed request.
- Tests cover the file layer and a conflicted copy; `docs/features/storage_choice.md` is updated and this file removed.

## Progress

Built on `backlog/choose-cloud-or-local-storage`: the first-launch screen with two cards, `StoragePreference` (remembered in UserDefaults), `LocalStorage.prepare` (creates `iCloud Drive/Inertia`, refuses when iCloud Drive is off), and a Local Storage screen that shows the folder, opens it in Finder and offers "Change storage". Documents, sheets and tasks do not use the folder yet. Not run: `swift test`, the app (sandboxed session: `InertiaCore` type-checks with `swiftc`, and an ad-hoc harness of the same logic passed, but XCTest and the app target were not built).

# Native Inertia for macOS

First stage of the gradual SwiftUI migration, requiring macOS 14+ and Xcode's Swift toolchain.

- `make dev-mac` starts the local API and web services, builds and opens `macos/dist/Inertia.app` with local endpoints, and streams service logs until the app closes.
- `make mac-build` stops all running instances of this checkout's `macos/dist/Inertia.app` and rebuilds it. API and web services keep running. The app gets five seconds to quit normally before being force-stopped. Reopen the app to use the new binary; for local endpoints, use `open -n --env INERTIA_API_URL=http://localhost:3000 --env INERTIA_WEB_URL=http://localhost:5174 macos/dist/Inertia.app`.
- `make dev-native-mac` builds and opens the native app with its default production endpoints.
- `make test-native-mac` runs the native regression tests.
- Open `macos/Package.swift` in Xcode to debug, or `swift run --package-path macos`.

The Mac app opens native sign-in followed by **Documents, Sheets & Tables** in the existing React workspace. Its sidebar, tabs, projects, documents, task views, and calendar all use the same components and layout as the web app in an isolated WKWebView. The Mac shell does not create a separate workspace or sidebar layout. Use `make dev-electron` for Electron development.

The login screen supports Apple and Google through the system browser, as well as email/password. Provider credentials must be configured on the backend; see [sign-in setup](../docs/mac-social-sign-in.md).

For the local development API, use `admin` / `admin` as a shortcut to the seeded test workspace. The existing `test@example.com` / `password123` login also works. Run `make db-seed` if the test account has not been created.

Production endpoints default to https://inertia.it.com. For development run:

```
INERTIA_API_URL=http://localhost:3000 INERTIA_WEB_URL=http://localhost:5174 swift run --package-path macos
```

Credentials are never saved to disk by the native app. Sessions are held in memory, with an ephemeral WebView data store; sign-in is required after relaunch. The bearer token is injected only into the configured web origin, never placed in a URL. External web links open in the default browser. The online workspace needs a network connection. Local task files work offline; automatic cloud synchronization and conflict resolution are not implemented.

The login screen, system authentication, window/file handling, and local task-file editor use SwiftUI/AppKit. The online workspace uses the existing React UI; native rich text/spreadsheet editors, file syncing, and persistent Keychain login remain future work. Distribution signing/notarization is not configured; builds are ad-hoc signed for local use.

## UI components

Native login, local task-file screens, and platform wrappers live in `Sources/Inertia/Components/`. The shared online workspace has one layout, `frontend/src/components/WorkspaceLayout.tsx`, and one sidebar, `frontend/src/components/file-manager/Sidebar.tsx`. Update those existing React components to change the workspace in every client. Shared native controls retain a single definition for login and local file editing.

## Local task files

The local Kanban editor opens when you explicitly create or open a task file.

Choose **File → New** (Command-N) to create an `.inertia-tasks` document, and **File → Save** (Command-S) to name it. Open an existing file with **File → Open** (Command-O) or Finder's **Open With → Inertia**. The local file editor does not require sign-in. Use **Online Workspace** in its toolbar to access the server-backed app.

- Switch between **Workboard**, **List**, **Sprints**, **Epics**, and **Milestones**.
- Create/edit tasks with titles, descriptions, due dates, a column, optional sprint, epic, multiple events, and parent task.
- Drag cards between columns, use a card's context menu, or change its column in List view.
- Create sprints with goals and dates, filter the board to one sprint, and see completion progress.
- Create epics with start/target dates and completion bars, and events (deadlines or milestones) with dates; legacy epic links and Reached state remain file extensions.
- Filter the board or list by sprint, epic, and event; View Tasks in each planning view opens its tasks.
- Rename/add/reorder columns and mark which columns count as completed.

See [the v4 format](../docs/task-file-format.md) and [the sample project](../examples/Launch.inertia-tasks). These files are independent of the Rails workspace; no automatic import/sync takes place. The extension is registered only by the built native `.app`, not `swift run` or Electron.

Versions 1–3 still open with relationships migrated to the shared Task/Epic/Event/User records. The next save writes v4. Older apps cannot read v4 files.

Use **Users** in the toolbar to optionally add people (name and optional email) to a local task file. In a task, choose an assignee, write a description, and add/edit/remove comments with optional authors. Click **Add Comment**, then **Save** the task to keep the changes. Users are local labels only; this does not create accounts, send invitations, or verify comment authors.

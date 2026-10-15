# Keyboard shortcuts

`⌘` is `Ctrl` on Windows/Linux (the handlers accept either `metaKey` or `ctrlKey`).

## Global (web + Electron)

Bound in one place: the `onKey` handler in `frontend/src/components/file-manager/Sidebar.tsx`. The in-app cheat sheet (`⌘/`) is rendered from `KEYBOARD_SHORTCUTS` in the same file, which is kept in sync by hand. Update both when adding a shortcut.

| Keys | Action |
|------|--------|
| `⌘K` | Quick-add a task or event |
| `⌘N` | New document in the current folder |
| `⌘⇧N` | New sheet in the current folder |
| `⌘T` | New task in the current folder (opens the backlog filtered to it, with the new-task form) |
| `⌘E` | New event |
| `⌘W` | Close the active tab |
| `⌘/` or `⌘?` | Show or hide the shortcuts list |
| `Esc` | Close the topmost open overlay (shortcuts, account, quick-add, Quip import, drawer) |

Notes:

- "Current folder" is the open folder page (`/folders/:id`) or the folder containing the open document. Elsewhere, new documents and sheets go to the first folder, and `⌘T` creates an unscoped task.
- In a plain browser, `⌘⇧N` is usually reserved (new incognito window), so it only works in the Electron app.
- `⌘W` is always `preventDefault`ed. In the packaged Electron app the native Window menu's `role: 'close'` accelerator still wins; see `frontend/electron/main.cjs`.
- `Esc` also closes the event dialog on the Events page (`EventsPage.tsx`).

## Inline inputs

| Keys | Where | Action |
|------|-------|--------|
| `Enter` | New folder, new epic/initiative, new task, table title, quick-add | Confirm |
| `Esc` | Same inputs (not the table title) | Cancel |

## Document editor

Document editor (TipTap, `frontend/src/pages/workspace/DocumentPage.tsx`) uses the extensions' default bindings.

| Keys | Action |
|------|--------|
| `⌘B` / `⌘I` / `⌘U` | Bold / italic / underline |
| `⌘⇧S` | Strikethrough |
| `⌘E` | Inline code |
| `⌘⌥1`–`⌘⌥6` | Heading 1–6 |
| `⌘⇧7` / `⌘⇧8` | Numbered / bulleted list |
| `⌘⌥C` | Code block |
| `Shift+Enter` | Line break |
| `⌘Z` / `⌘⇧Z` | Undo / redo |

Task items (`frontend/src/extensions/WorkspaceTaskItem.tsx`):

| Keys | Action |
|------|--------|
| `Enter` | New task item (splits the list item) |
| `Tab` | Indent |
| `Shift+Tab` | Outdent |

Known overlap: `⌘E` is both "inline code" in the editor and the global "New event". The global handler is on `window`, so it fires as well.

## macOS app

Defined in `macos/Sources/Inertia`.

| Keys | Action |
|------|--------|
| `⌘R` | Refresh space |
| `Return` | Default action in sheets (Save / Done) |
| `Esc` | Cancel a sheet |

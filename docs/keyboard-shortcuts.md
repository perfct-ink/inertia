# Keyboard shortcuts

`⌘` is `Ctrl` on Windows/Linux (the handlers accept either `metaKey` or `ctrlKey`).

## Global (web + Electron)

Bound in one place: the `onKey` handler in `frontend/src/components/file-manager/Sidebar.tsx`, using `isShortcut` from `frontend/src/util/shortcuts.ts` (which reads the physical key, so `⌥N` still counts as N). The in-app cheat sheet (`⌘/`) is rendered from `KEYBOARD_SHORTCUTS` in the same file, which is kept in sync by hand. Update both when adding a shortcut.

Browsers (Safari, Chrome, Firefox) keep `⌘N`, `⇧⌘N` and `⌘T` for their own windows and tabs and never pass them to the page, so in a browser those three also take `⌥`. The Electron app and the Mac shell pass them on, so there `⌘` alone works. `shortcutLabel` shows the right form in the cheat sheet and tooltips.

| Keys (Electron, Mac app) | Keys (browser) | Action |
|------|------|--------|
| `⌘K` | `⌘K` | Quick-add a task or event |
| `⌘N` | `⌥⌘N` | New document in the current folder |
| `⌘⇧N` | `⌥⌘⇧N` | New sheet in the current folder |
| `⌘T` | `⌥⌘T` | New task in the current folder (opens the backlog filtered to it, with the new-task form) |
| `⌘E` | `⌘E` | New event |
| `⌘J` | `⌘J` | New idea (opens Ideas with the cursor in the idea field) |
| `⌘W` | (none) | Close the active tab |
| `⌘/` or `⌘?` | `⌘/` or `⌘?` | Show or hide the shortcuts list |
| `Esc` | `Esc` | Close the topmost open overlay (shortcuts, quick-add, Quip import, drawer) |

Notes:

- "Current folder" is the open folder page (`/folders/:id`) or the folder containing the open document. Elsewhere, new documents and sheets go to the first folder, and `⌘T` creates an unscoped task.
- In a browser `⌘W` closes the browser tab and `⌥⌘W` closes all the other tabs in Safari, so there is no in-app close-tab shortcut there; the cheat sheet leaves it out (`shortcutAvailable`). In the packaged Electron app the native Window menu's `role: 'close'` accelerator still wins; see `frontend/electron/main.cjs`. The Mac app's menu routes `⌘N` and `⌘⇧N` to the page (`macos/Sources/Inertia/InertiaApp.swift`).
- The browser `⌥⌘T` (new task) is the key the editor comparison below proposes for inserting a table, which isn't bound yet; pick one before binding it.
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

## Collection map

With the map itself focused (Collection page, **Map** view; `frontend/src/components/editors/CollectionMap.tsx`). Tab moves on to the pins, where Enter or Space selects one.

| Keys | Action |
|------|--------|
| Arrow keys | Move the map 64px |
| `+` / `-` | Zoom in / out |
| `Esc` | Close the selected pin's details |

## macOS app

Defined in `macos/Sources/Inertia`.

| Keys | Action |
|------|--------|
| `⌘R` | Refresh space |
| `Return` | Default action in sheets (Save / Done) |
| `Esc` | Cancel a sheet |

## Planned bindings (not built)

Requested by Alex, 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins. Everything above is what the code does today; this table is the proposal. Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building. Mac keys; `⌘` is `Ctrl` elsewhere.

The work is split into tasks in `docs/backlog/`: `rebind-editor-shortcuts-to-apple-notes-map.md` (the table), `editor-vs-global-shortcut-clashes.md`, `dashed-list-block.md`, `mac-app-format-menu-shortcuts.md`, `windows-linux-editor-shortcuts.md`, and `paragraph-style-keystrokes.md`. When a binding is built, move it from this table into the tables above.

| Action | Apple Notes | Google Docs | Inertia should use | Today |
| --- | --- | --- | --- | --- |
| Bold / italic / underline | `⌘B` `⌘I` `⌘U` | same | same | matches |
| Strikethrough | `⌘⇧X` | `⌘⇧X` | `⌘⇧X` | `⌘⇧S` |
| Title / Heading / Subheading / Body | `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` | (none) | Notes keys → H1 / H2 / H3 / paragraph | not bound |
| Heading 1–6, normal text | (none) | `⌘⌥1`–`6`, `⌘⌥0` | Docs keys | `⌘⌥1`–`6` match; `⌘⌥0` missing |
| Monospaced / code block | `⌘⇧M` | (none) | `⌘⇧M` | `⌘⌥C` |
| Bulleted list | `⌘⇧7` | `⌘⇧8` | **`⌘⇧7`** (Notes wins) | `⌘⇧8` |
| Dashed list | `⌘⇧8` | (bullets) | **`⌘⇧8`** dashed list (Notes wins) | bulleted list |
| Numbered list | `⌘⇧9` | `⌘⇧7` | **`⌘⇧9`** (Notes wins) | `⌘⇧7` |
| Checklist (task item) | `⌘⇧L` | `⌘⇧9` | **`⌘⇧L`** (Notes wins) | not bound |
| Mark checklist item done | `⌘⇧U` | (none) | `⌘⇧U` | not bound |
| Insert link | `⌘K` | `⌘K` | `⌘K` inside the editor | `⌘K` is the global quick-add |
| Indent / outdent | `⌘]` / `⌘[` | `⌘]` / `⌘[` | same, plus Tab / Shift+Tab in lists | Tab only in task lists |
| Move list item up / down | `⌃⌘↑` / `⌃⌘↓` | (none) | Notes keys | not bound |
| Table | `⌥⌘T` | (none) | `⌥⌘T` | not bound |
| Align left / center / right / justify | (none) | `⌘⇧L` / `⌘⇧E` / `⌘⇧R` / `⌘⇧J` | center/right/justify from Docs; left can't use `⌘⇧L` (checklist) or `⌘⇧J` (Subheading), so left is menu-only | not present |
| Clear formatting | (none) | `⌘\` | `⌘\` | not bound |
| Comment | (none) | `⌘⌥M` | `⌘⌥M` (with `comments-on-documents.md`) | n/a |
| Paste without formatting | `⌥⇧⌘V` | `⌘⇧V` | both | browser default |
| Superscript / subscript | (none) | `⌘.` / `⌘,` | Docs keys | not present |
| Markdown-style typing (`- `, `1. `, `# `, `[] `) | partial | partial | keep TipTap's input rules | works |

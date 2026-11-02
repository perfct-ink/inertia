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

## Collection map

With the map itself focused (Collection page, **Map** view; `frontend/src/components/editors/CollectionMap.tsx`). Tab moves on to the pins, where Enter or Space selects one.

| Keys | Action |
|------|--------|
| Arrow keys | Move the map 64px |
| `+` / `-` | Zoom in / out |
| `Esc` | Close the selected pin's details |

## Gantt and timeline bars

With a bar focused (Tab to it; the folder Gantt, the Epics and Initiatives Timeline tabs and the Roadmap timeline; `frontend/src/components/Timeline.tsx`, `hooks/useBarKeyboard.ts`, keys in `barKeyAction` in `data/schedule.ts`). Only bars that can be dragged take these keys. `⌘` and `Ctrl` combinations are left to the browser.

| Keys | Action |
|------|--------|
| `←` / `→` | Move the bar a day earlier / later |
| `Page Up` / `Page Down` | Move the bar a week earlier / later |
| `Shift` + `←` / `→` | Shorten / lengthen the bar by moving its end |
| `Alt` + `←` / `→` | Move the start of the bar earlier / later |
| `Shift` or `Alt` + `Page Up` / `Page Down` | Same, a week at a time |
| `Enter` | Save now (otherwise it saves 600 ms after the last key, or when you leave the bar) |
| `Esc` | Drop a move that has not been saved |

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

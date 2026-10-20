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

Document editor (TipTap, `frontend/src/view/document/DocumentScreen.tsx`). The shortcuts below come from one table, `EDITOR_SHORTCUTS` in `frontend/src/data/shortcuts.ts`: `extensions/EditorShortcuts.ts` binds them, and a test fails if this table stops listing one. Apple Notes keys where the two apps differ.

| Keys | Action |
|------|--------|
| `⌘B` / `⌘I` / `⌘U` | Bold / italic / underline |
| `⌘⇧X` | Strikethrough |
| `⌘⇧T` | Title (Heading 1) |
| `⌘⇧H` | Heading (Heading 2) |
| `⌘⇧J` | Subheading (Heading 3) |
| `⌘⇧B` | Body text |
| `⌘⌥0` | Normal text |
| `⌘⌥1`–`⌘⌥6` | Heading 1–6 (TipTap default) |
| `⌘⇧7` | Bulleted list |
| `⌘⇧9` | Numbered list |
| `⌘⇧L` | Checklist |
| `⌘⇧M` | Monospaced code block |
| `⌥⌘T` | Insert table |
| `⌘]` | Indent list item |
| `⌘[` | Outdent list item |
| `⌘\` | Clear formatting |
| `⌘E` | Inline code (TipTap default) |
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

## Planned bindings (not built)

Requested by Alex, 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins. Everything above is what the code does today; this table is the proposal. Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building. Mac keys; `⌘` is `Ctrl` elsewhere.

The work is split into tasks in `docs/backlog/`: `rebind-editor-shortcuts-to-apple-notes-map.md` (the table), `editor-vs-global-shortcut-clashes.md`, `dashed-list-block.md`, `mac-app-format-menu-shortcuts.md`, `windows-linux-editor-shortcuts.md`, and `paragraph-style-keystrokes.md`. When a binding is built, move it from this table into the tables above.

| Action | Apple Notes | Google Docs | Inertia should use | Today |
| --- | --- | --- | --- | --- |
| Bold / italic / underline | `⌘B` `⌘I` `⌘U` | same | same | matches |
| Strikethrough | `⌘⇧X` | `⌘⇧X` | `⌘⇧X` | **built** (see Document editor) |
| Title / Heading / Subheading / Body | `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` | (none) | Notes keys → H1 / H2 / H3 / paragraph | **built** (see Document editor) |
| Heading 1–6, normal text | (none) | `⌘⌥1`–`6`, `⌘⌥0` | Docs keys | **built** (see Document editor) |
| Monospaced / code block | `⌘⇧M` | (none) | `⌘⇧M` | **built** (see Document editor) |
| Bulleted list | `⌘⇧7` | `⌘⇧8` | **`⌘⇧7`** (Notes wins) | **built** (see Document editor) |
| Dashed list | `⌘⇧8` | (bullets) | **`⌘⇧8`** dashed list (Notes wins) | bulleted list |
| Numbered list | `⌘⇧9` | `⌘⇧7` | **`⌘⇧9`** (Notes wins) | **built** (see Document editor) |
| Checklist (task item) | `⌘⇧L` | `⌘⇧9` | **`⌘⇧L`** (Notes wins) | **built** (see Document editor) |
| Mark checklist item done | `⌘⇧U` | (none) | `⌘⇧U` | not bound |
| Insert link | `⌘K` | `⌘K` | `⌘K` inside the editor | `⌘K` is the global quick-add |
| Indent / outdent | `⌘]` / `⌘[` | `⌘]` / `⌘[` | same, plus Tab / Shift+Tab in lists | **built** (see Document editor) |
| Move list item up / down | `⌃⌘↑` / `⌃⌘↓` | (none) | Notes keys | not bound |
| Table | `⌥⌘T` | (none) | `⌥⌘T` | **built** (see Document editor) |
| Align left / center / right / justify | (none) | `⌘⇧L` / `⌘⇧E` / `⌘⇧R` / `⌘⇧J` | center/right/justify from Docs; left can't use `⌘⇧L` (checklist) or `⌘⇧J` (Subheading), so left is menu-only | not present |
| Clear formatting | (none) | `⌘\` | `⌘\` | **built** (see Document editor) |
| Comment | (none) | `⌘⌥M` | `⌘⌥M` (with `comments-on-documents.md`) | n/a |
| Paste without formatting | `⌥⇧⌘V` | `⌘⇧V` | both | browser default |
| Superscript / subscript | (none) | `⌘.` / `⌘,` | Docs keys | not present |
| Markdown-style typing (`- `, `1. `, `# `, `[] `) | partial | partial | keep TipTap's input rules | works |

Built 2026-10-19 on branch `backlog/rebind-editor-shortcuts-to-apple-notes-map` (not merged; the keys are from the table above and were not checked against the two apps' menus). Not yet built: dashed list `⌘⇧8`, mark checklist item done `⌘⇧U`, `⌘K` insert link (clashes with the global quick-add), move list item up/down, alignment, superscript/subscript, comment, paste without formatting.

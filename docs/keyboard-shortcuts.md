# Keyboard shortcuts

`⌘` is `Ctrl` on Windows/Linux (the handlers accept either `metaKey` or `ctrlKey`).

## Global (web + Electron)

Bound in one place: the `onKey` handler in `frontend/src/components/file-manager/Sidebar.tsx`, using `isShortcut` from `frontend/src/util/shortcuts.ts` (which reads the physical key, so `⌥N` still counts as N). The in-app cheat sheet (`⌘/`) is rendered from `KEYBOARD_SHORTCUTS` in the same file, which is kept in sync by hand. Update both when adding a shortcut. Under it, an "In a document" group lists the editor's keys from `frontend/src/data/editorShortcut.ts` (see Document editor below); the sheet scrolls on a short screen.

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

- "Current folder" is the open folder page (a folder path such as `/product`, or `/folders/:id`) or the folder containing the open document. Elsewhere, new documents and sheets go to the first folder, and `⌘T` creates an unscoped task.
- In a browser `⌘W` closes the browser tab and `⌥⌘W` closes all the other tabs in Safari, so there is no in-app close-tab shortcut there; the cheat sheet leaves it out (`shortcutAvailable`). In the packaged Electron app the native Window menu's `role: 'close'` accelerator still wins; see `frontend/electron/main.cjs`. The Mac app's menu routes `⌘N` and `⌘⇧N` to the page (`macos/Sources/Inertia/InertiaApp.swift`).
- In a document, `⌥⌘T` inserts a table and `⌘K` opens the link dialog; the editor wins over the global New task and quick-add there (`editor-vs-global-shortcut-clashes`).
- `Esc` also closes the event dialog on the Events page (`EventsPage.tsx`).

## Inline inputs

| Keys | Where | Action |
|------|-------|--------|
| `Enter` | New folder, new epic/initiative, new task, table title, quick-add | Confirm |
| `Esc` | Same inputs (not the table title) | Cancel |

## Document editor

Document editor (TipTap, `frontend/src/view/document/DocumentScreen.tsx`). The keys follow Apple Notes, and Google Docs where Notes has none; where the two differ, Notes wins (Alex, 2026-10-18). `⌘` is `Ctrl` elsewhere (`⌃⌘↑` and `⌃⌘↓` are Mac only until `windows-linux-editor-shortcuts` is built).

One table in code, `EDITOR_SHORTCUTS` in `frontend/src/data/editorShortcut.ts`, holds the keys the editor binds. `extensions/EditorShortcuts.ts` binds it, the `⌘/` sheet ("In a document") and the toolbar tooltips read it, and a test (`data/editorShortcut.test.ts`) fails if this page stops listing a row. Update the table first and this page second. `extensions/withoutShortcuts.ts` drops the TipTap defaults the table replaces (`⌘⇧S`, `⌘⇧8` bullets, `⌘⇧7` numbers, `⌥⌘C`), so one keystroke never does two things.

Keys the editor binds:

| Keys (Mac) | Keys (Windows, Linux) | Action |
|------|------|--------|
| `⌘⇧X` | `Ctrl+Shift+X` | Strikethrough |
| `⌘⇧7` | `Ctrl+Shift+7` | Bulleted list |
| `⌘⇧9` | `Ctrl+Shift+9` | Numbered list |
| `⌘⇧L` | `Ctrl+Shift+L` | Checklist (inserts a checklist at the cursor, like the toolbar button) |
| `⌘⇧U` | `Ctrl+Shift+U` | Mark checklist item done (presses the line's checkbox, so it saves the task the way a click does; a line not yet saved as a task has none) |
| `⌘]` | `Ctrl+]` | Indent list item (bulleted or numbered; a checklist line holds one paragraph and can't nest) |
| `⌘[` | `Ctrl+[` | Outdent list item (on a checklist line it takes the line out of the list, like Shift+Tab) |
| `⌃⌘↑` | `Ctrl+Shift+↑` | Move list item up (bulleted, numbered or checklist; within its own list) |
| `⌃⌘↓` | `Ctrl+Shift+↓` | Move list item down |
| `⌘⇧M` | `Ctrl+Shift+M` | Code block (Apple Notes' Monospaced key; the Monospace paragraph style and the code block are one thing, see below) |
| `⌘K` | `Ctrl+K` | Insert link (opens the link dialog; in a document the editor wins over the global quick-add) |
| `⌥⌘T` | (none) | Insert table (Mac only; on Windows and Linux use the toolbar button, see below) |
| `⌘\` | `Ctrl+\` | Clear formatting (drops bold, italic, links and the like, and turns the block back into plain text) |

Keys that already matched Apple Notes or Google Docs and are bound by TipTap's own extensions or by the browser:

| Keys (Mac) | Keys (Windows, Linux) | Action |
|------|------|--------|
| `⌘B` | `Ctrl+B` | Bold |
| `⌘I` | `Ctrl+I` | Italic |
| `⌘U` | `Ctrl+U` | Underline |
| `⌘Z` | `Ctrl+Z` | Undo |
| `⌘⇧Z` | `Ctrl+Shift+Z` | Redo |
| `⌘⌥1–5` | `Ctrl+Alt+1–5` | Heading 1 to 5 (the editor allows no Heading 6 yet) |
| `⌘⌥0` | `Ctrl+Alt+0` | Normal text |
| `⌘E` | `Ctrl+E` | Inline code |
| `Shift+Enter` | `Shift+Enter` | Line break |
| `⌘⇧V` | `Ctrl+Shift+V` | Paste without formatting (ProseMirror pastes plain text while Shift is down; Safari's `⌥⇧⌘V` does too) |
| `Tab`, `Shift+Tab` | (same) | Nest and lift a bulleted or numbered item (TipTap's list item) |

Notes on the choices:

- The code block is `⌘⇧M`, Apple Notes' own "Monospaced" key. Alex decided on 2026-11-09 that the code block and the Monospace paragraph style are the same thing, so they share the key (`paragraph-style-shortcuts` also binds `⌘⇧M` to the Monospace style, set on 2026-11-06). Until that branch merges, `⌘⇧M` makes a code block here and the Monospace style has no key. When it merges, the Monospace style must become the code block, with a language and syntax highlighting, so the key does one thing: that unification is the backlog task `code-blocks-with-language-and-syntax-highlighting`. In Chrome on a Mac, `⌘⇧M` is the browser's profile menu, so it may not reach the page there. TipTap's own `⌘⌥C` is the browsers' inspector and is dropped.
- Apple Notes' `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` (Title, Heading, Subheading, Body) are deliberately not bound. Title is a style of its own here, not Heading 1, and Alex's style keys are `⌘⌥` and a digit (`⌘⌥7` Title, `⌘⌥8` Subtitle, `⌘⌥9` Quote, `⌘⌥0` Body; `paragraph-style-shortcuts`). `⌘⇧T` and `⌘⇧J` would also fire the global New task and New idea, whose handler ignores Shift, and browsers keep `⌘⇧T`, `⌘⇧B`, `⌘⇧H` and `⌘⇧J` for themselves.
- None of the table's keys is one the global handler matches (a test reads `Sidebar.tsx` for that). Browsers keep `⌘[` and `⌘]` for Back and Forward and Safari keeps `⌘⇧L` for its sidebar, so in the editor those depend on the page being allowed to take them first; see the feature doc's known limits.
- `⌘⇧8` (Dashed list, held for the dashed list block's key) and `⌘⌥7`/`8`/`9` are reserved for the tasks that bind them (`RESERVED_KEYS` in the data file), and the table can't take them.

Keys the editor never binds on Windows and Linux, because the browser or the desktop keeps them (`BROWSER_RESERVED_KEYS` and `DESKTOP_RESERVED_KEYS` in the data file): `Ctrl+N` (new window), `Ctrl+Shift+N` (new private window), `Ctrl+T` (new tab), `Ctrl+Shift+T` (reopen the closed tab), `Ctrl+W` (close the tab), `Ctrl+Shift+W` (close the window), `Ctrl+Q` (quit), and `Ctrl+Alt+T` (opens a terminal on Ubuntu and other GNOME or KDE desktops, so the table key is Mac only).

### Paragraph styles

The built-in paragraph styles (see `docs/features/paragraph_styles.md`) have `⌘⌥` plus a digit, like Google Docs' headings, except Monospace, which has `⌘⇧M` as in Apple Notes. The table is `PARAGRAPH_STYLE_SHORTCUTS` in `frontend/src/data/paragraphStyleShortcut.ts`; `extensions/ParagraphStyleShortcuts.ts` binds it, the Style menu shows each key beside its style, the `⌘/` sheet lists them, and a test fails if this table stops listing one. Digits are used because browsers keep `⌘N`, `⌘T` and `⌘W`, and `⌃⌘1`–`⌃⌘9` stay free for keys people assign to a style themselves (`paragraph-style-keystrokes`).

| Keys | Style | Bound by |
|------|-------|----------|
| `⌘⌥7` | Title | the style table (sets the style) |
| `⌘⌥8` | Subtitle | the style table |
| `⌘⌥1` | Heading 1 | TipTap's Heading (toggles it) |
| `⌘⌥2` | Heading 2 | TipTap's Heading |
| `⌘⌥3` | Heading 3 | TipTap's Heading |
| `⌘⌥0` | Body | the style table (TipTap's Paragraph has the same key) |
| `⌘⌥9` | Quote | the style table |
| `⌘⇧M` | Monospace | the style table |
| `⌘⌥4`, `⌘⌥5`, `⌘⌥6` | Heading 4, 5, 6 | TipTap's Heading (these have no entry in the Style menu) |

Heading 1 to 6 are `⌘⌥1` to `⌘⌥6` (Alex's call). Caption has no default key yet: neither Apple Notes nor Google Docs has one, and Alex hasn't chosen one.

`⌘⇧M` is Monospace by Alex's decision (2026-11-06). In Chrome on a Mac that key is the browser's own profile menu, so it may not reach the page there; Safari and the Mac app pass it on.

Clashes, checked against the Apple Notes map below and the branch that builds it (`backlog/rebind-editor-shortcuts-to-apple-notes-map`, `data/shortcuts.ts`):

- Keys: `⌘⌥0` is shared: that branch binds it as "Normal text" to the same plain-paragraph command. Harmless when both merge, but drop one of the two. `⌘⇧M` is shared too, and not harmless (code block there, Monospace here). `⌘⌥7`, `⌘⌥8` and `⌘⌥9` are not used there.
- Meaning: its Title / Heading / Subheading keys `⌘⇧T` / `⌘⇧H` / `⌘⇧J` make Heading 1 / 2 / 3, while here Title is a style of its own (`⌘⌥7`). Its `⌘⇧M` makes a code block, but `⌘⇧M` is Monospace here, so that branch has to give the code block another key.
- macOS Zoom, if switched on in System Settings, takes `⌥⌘8` before the page does.

Task items (`frontend/src/extensions/WorkspaceTaskItem.tsx`):

| Keys (Mac) | Keys (Windows, Linux) | Action |
|------|------|--------|
| `Enter` | (same) | New task item (splits the list item) |
| `Tab` | (same) | Indent |
| `Shift+Tab` | (same) | Outdent |

Known overlap: `⌘E` is both "inline code" in the editor and the global "New event". The global handler is on `window`, so it fires as well (`editor-vs-global-shortcut-clashes`).

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

## Planned bindings (the rows not built)

Requested by Alex, 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins. The tables above are what the code does today. This is the proposal's map, kept for the rows that are not bound yet; the rows `rebind-editor-shortcuts-to-apple-notes-map` built moved into the tables above. Both apps' bindings are from training knowledge (mid-2026) and were not checked against each app's menus. Mac keys; `⌘` is `Ctrl` elsewhere.

The rest of the work is split into tasks in `docs/backlog/`: `editor-vs-global-shortcut-clashes.md`, `dashed-list-block.md`, `mac-app-format-menu-shortcuts.md`, `windows-linux-editor-shortcuts.md`, `paragraph-style-shortcuts.md` and `paragraph-style-keystrokes.md`. When a binding is built, move it from this table into the tables above, and add it to `EDITOR_SHORTCUTS` (or take it off `RESERVED_KEYS`).

| Action | Apple Notes | Google Docs | Inertia should use | Status |
| --- | --- | --- | --- | --- |
| Title / Heading / Subheading / Body | `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` | (none) | not bound: Alex's style keys `⌘⌥7`, `⌘⌥8`, `⌘⌥1`–`3`, `⌘⌥0` replace them (see the notes under Document editor) | `paragraph-style-shortcuts` |
| Heading 6 | (none) | `⌘⌥6` | Docs key | the editor allows Headings 1 to 5 only, so `⌘⌥6` does nothing (`paragraph-style-shortcuts` enables level 6) |
| Monospaced | `⌘⇧M` | (none) | `⌘⇧M`, the code block (Monospace and the code block are one thing, Alex 2026-11-09) | built as the code block; the Monospace style takes the same block when `paragraph-style-shortcuts` merges (`code-blocks-with-language-and-syntax-highlighting`) |
| Dashed list | `⌘⇧8` | (bullets) | **`⌘⇧8`** dashed list (Notes wins) | `dashed-list-block` (`⌘⇧8` is free: the bullet list no longer takes it) |
| Insert link | `⌘K` | `⌘K` | `⌘K` inside the editor | `editor-vs-global-shortcut-clashes` (`⌘K` is the global quick-add) |
| Table | `⌥⌘T` | (none) | `⌥⌘T` | `editor-vs-global-shortcut-clashes`: in a browser `⌥⌘T` is the global New task, so it can't be bound until that is settled |
| Align left / center / right / justify | (none) | `⌘⇧L` / `⌘⇧E` / `⌘⇧R` / `⌘⇧J` | center/right/justify from Docs; left can't use `⌘⇧L` (checklist), so left is menu-only | not built: needs a text-align extension, a stored attribute and the collab schema; `⌘⇧E` and `⌘⇧J` would also fire the global New event and New idea, which ignore Shift |
| Bold / italic / underline | `⌘B` `⌘I` `⌘U` | same | same | matches |
| Strikethrough | `⌘⇧X` | `⌘⇧X` | `⌘⇧X` | `⌘⇧S` |
| Title / Heading / Subheading / Body | `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` | (none) | Notes keys → H1 / H2 / H3 / paragraph | not bound |
| Heading 1–6, normal text | (none) | `⌘⌥1`–`6`, `⌘⌥0` | Docs keys | `⌘⌥1`–`5` match; `⌘⌥0` is the Body style (see Paragraph styles) |
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
| Superscript / subscript | (none) | `⌘.` / `⌘,` | Docs keys | not built: needs the marks and the collab schema |
| Markdown-style typing (`- `, `1. `, `# `, `[] `) | partial | partial | keep TipTap's input rules | works |

# Editor shortcuts (Apple Notes map)

## What it does
The document editor's formatting keystrokes follow Apple Notes, with Google Docs keys where Notes has none: strikethrough `⌘⇧X`; Title / Heading / Subheading as Heading 1 / 2 / 3 on `⌘⇧T` / `⌘⇧H` / `⌘⇧J`; Body `⌘⇧B` and Normal text `⌘⌥0`; bulleted list `⌘⇧7`, numbered list `⌘⇧9`, checklist `⌘⇧L`; monospaced code block `⌘⇧M`; table `⌥⌘T`; indent / outdent a list item `⌘]` / `⌘[`; clear formatting `⌘\`. (`⌘` is Ctrl elsewhere.) The old defaults these replace (`⌘⇧S`, `⌘⇧8` bullets, `⌘⇧7` numbers, `⌥⌘C`) are removed so one keystroke does one thing. The `⌘/` cheat sheet lists them under "In a document". Full tables, and what is not yet built, are in `docs/keyboard-shortcuts.md`.

## API and models
None. One table, `EDITOR_SHORTCUTS` in `frontend/src/data/shortcuts.ts`, is read by `extensions/EditorShortcuts.ts` (the bindings), the cheat sheet in `file-manager/Sidebar.tsx`, and a test that fails if `docs/keyboard-shortcuts.md` stops listing one. `extensions/withoutShortcuts.ts` drops the replaced defaults from Strike, BulletList, OrderedList and CodeBlock while keeping their other keys.

## Who can view and change
Anyone editing a document.

## Tests
`frontend/src/data/shortcuts.test.ts` (no duplicate keystrokes; the doc lists every shortcut; stand-in runner: pass).

## Known limits
- Not built: dashed list `⌘⇧8`, mark checklist item done `⌘⇧U`, `⌘K` insert link (clashes with the global quick-add), move list item up or down, alignment, superscript and subscript, comment, paste without formatting. Windows and Linux key checks, and the Mac app's Format menu, are separate backlog tasks.
- The keys come from the proposal table, which was written from memory of both apps and not checked against their menus. Some browsers reserve a few combinations (`⌘⇧T` reopens a tab in Chrome/Safari, `⌘⇧B` shows the bookmarks bar in some browsers) so those may not reach the editor outside the Electron/Mac app.
- Editing mode only was tried by reading the code: no keystroke was pressed in a browser.

## History
- Implemented 2026-10-19 on branch `backlog/rebind-editor-shortcuts-to-apple-notes-map`. Not merged or deployed.
- Not verified: lint, type-check, component tests and every keystroke in a browser (no node_modules).

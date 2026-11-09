# Editor shortcuts (Apple Notes map)

## What it does
The document editor's formatting keystrokes follow Apple Notes, with Google Docs keys where Notes has none, and Notes wins where they differ (Alex, 2026-10-18). Mac keys; `⌘` is `Ctrl` elsewhere.

| Keys | Action |
| --- | --- |
| `⌘⇧X` | Strikethrough |
| `⌘⇧7` / `⌘⇧9` | Bulleted / numbered list |
| `⌘⇧L` | Checklist (inserts one at the cursor, like the toolbar button) |
| `⌘⇧U` | Mark the checklist line done, or not done again |
| `⌘]` / `⌘[` | Indent / outdent a list item (on a checklist line, `⌘[` takes it out of the list) |
| `⌃⌘↑` / `⌃⌘↓` | Move a list item up / down within its list |
| `⌘⌥⇧C` | Code block |
| `⌘\` | Clear formatting (marks off, block back to plain text) |

Already matching and left as they were: `⌘B` `⌘I` `⌘U`, `⌘Z` / `⌘⇧Z`, `⌘⌥1`–`5` headings, `⌘⌥0` normal text, `⌘E` inline code, `Shift+Enter`, `⌘⇧V` paste without formatting (ProseMirror), Tab and Shift+Tab in lists. The old TipTap defaults the table replaces (`⌘⇧S`, `⌘⇧8` bullets, `⌘⇧7` numbers, `⌥⌘C`) are removed so one keystroke does one thing. The `⌘/` sheet lists all of them under "In a document", and the toolbar tooltips show the key for strikethrough, lists, task list and code block. The full tables, and the rows not built, are in `docs/keyboard-shortcuts.md`.

Choices made (recorded for Alex):
- The code block is `⌘⌥⇧C`, not Notes' `⌘⇧M`: that key is "Monospaced" in Notes, which is the Monospace paragraph style here, and Alex gave that style `⌘⇧M` (2026-11-06, branch `backlog/paragraph-style-shortcuts`). `⌘⇧M` stays unbound until that branch merges; the table can't take it (`RESERVED_KEYS`).
- Notes' Title / Heading / Subheading / Body keys (`⌘⇧T` `⌘⇧H` `⌘⇧J` `⌘⇧B`) are not bound: Title is a style of its own here, Alex's style keys are `⌘⌥` plus a digit, `⌘⇧T` and `⌘⇧J` would also fire the global New task and New idea (the handler ignores Shift), and browsers keep all four.
- Left to other backlog tasks, with their keys reserved: dashed list `⌘⇧8`, insert link `⌘K` and table `⌥⌘T` (both clash with global shortcuts), the paragraph-style keys `⌘⌥7`/`8`/`9` and `⌘⇧M`. Not built: alignment, superscript / subscript (each needs an extension, a stored attribute and the collab schema) and comment (`comments-on-documents`).

## API and models
None. `EDITOR_SHORTCUTS` in `frontend/src/data/editorShortcut.ts` is the table (with `INHERITED_SHORTCUTS`, `RESERVED_KEYS` and `REPLACED_DEFAULTS`). `extensions/EditorShortcuts.ts` binds it through `util/editorKeymap.ts`; the commands (`insertTaskList`, `toggleTaskDone`, `moveListItem`) are in `util/editorCommand.ts`; `extensions/withoutShortcuts.ts` drops the replaced defaults from Strike, BulletList, OrderedList and CodeBlock (keeping their other keys) in `view/document/DocumentScreen.tsx`. `⌘⇧U` presses the line's own checkbox in `WorkspaceTaskItemView`, so it saves through the same task update as a click and a failed save shows the same error. Moving an item deletes its neighbour and puts it back on the other side, so the item being edited keeps its place, cursor and task link.

## Who can view and change
Anyone who can edit the document. No permission changes.

## Tests
- `frontend/src/data/editorShortcut.test.ts`: no key bound twice, reserved keys stay free, the table avoids every key the global handler in `Sidebar.tsx` matches, and `docs/keyboard-shortcuts.md` lists every row.
- `frontend/src/util/editorKeymap.test.ts` and `util/editorCommand.test.ts`: each key runs its command; list moves, checkbox press, checklist insert (fake editor).
- `frontend/src/extensions/EditorShortcuts.test.ts`: real TipTap editor, keydown events through the editor's handlers (lists, strike, code block, indent, move, clear formatting, the dropped defaults).

## Known limits
- Windows and Linux: the `Mod` keys become `Ctrl`, but `⌃⌘↑` / `⌃⌘↓` are Mac only and no Windows or Linux key was checked against browser-reserved ones (`windows-linux-editor-shortcuts`). The Mac app's Format menu is `mac-app-format-menu-shortcuts`.
- Browsers keep some of these (`⌘[` and `⌘]` are Back and Forward; `⌘⇧L` is Safari's sidebar), so whether the page gets them first is untried in Safari, Chrome and Firefox.
- A checklist line holds one paragraph and cannot nest, so `⌘]` does nothing there. `⌘⇧U` does nothing on a line not yet saved as a task.
- `⌘⇧L` inserts at the cursor rather than converting the current line. `⌘\` also takes list items and checklist lines out of their list.
- `⌘⌥6` does nothing: the editor allows Headings 1 to 5 (`paragraph-style-shortcuts` enables level 6).
- The Notes and Docs keys were written from memory (mid-2026) and not checked against each app's menus.

## History
- Implemented 2026-11-09 on branch `backlog/rebind-editor-shortcuts-to-apple-notes-map` (rebuilt on current main from the 2026-10-19 branch and a cut-off attempt). Not merged or deployed.
- Not verified: lint, `tsc -b`, the real Jest suite (including `EditorShortcuts.test.ts`, which needs TipTap and was never run), and every keystroke in a browser at desktop and 375px, light and dark. The key table, commands, cheat sheet rows and doc test ran in an offline Jest stand-in.

---
priority: p1
depends_on: []
components: [frontend, backend]
branch: backlog/rebind-editor-shortcuts-to-apple-notes-map
status: incomplete
---
# Rebind the editor to the map above

## Objective

**Rebind the editor to the map above**, Apple Notes first

## Requirements / notes

One shortcut table in code that the editor, the `⌘/` cheat sheet and `docs/keyboard-shortcuts.md` all read, so they can't drift.

### Merged in (Alex, 2026-11-09 groom)

The editor shortcut tasks are one task. This file now also covers:

- **Clashes with global shortcuts** (was `editor-vs-global-shortcut-clashes.md`): `⌘K` (quick-add) and `⌘E` (new event; also inline code today). Default: inside the document editor the formatting meaning wins (`⌘K` = link); quick-add moves to another key or works from outside the editor only.
- **Windows/Linux** (was `windows-linux-editor-shortcuts.md`): `Ctrl` for `⌘`; check each against browser-reserved keys (e.g. `Ctrl+Shift+N`, `Ctrl+Shift+T`).
- **Mac app Format menu** (was `mac-app-format-menu-shortcuts.md`): the Mac app loads the web editor, so the bindings carry over; add Format menu items showing each shortcut so people can find them.
- **Dashed list key** for `dashed-list-block.md`, which ships first with a toolbar button.

Kept separate: `paragraph-style-shortcuts.md`, because it is already built on its own branch (`backlog/paragraph-style-shortcuts`) and only waits on checks; merging its file would orphan that branch. `docs/keyboard-shortcuts.md` still lists the three merged files; update that list when this task merges.

## Context

Section "Document shortcuts match Apple Notes and Google Docs" of the retired shared backlog.

Requested by Alex on 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins.

**Today** the editor uses TipTap's default bindings (see `docs/keyboard-shortcuts.md`). Bold, italic, underline, undo/redo and `⌘⌥1`–`6` headings already match Google Docs. The rest don't match either app.

Proposed map (Mac keys; `⌘` is `Ctrl` elsewhere). Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building.

The full proposed keystroke map (Apple Notes vs Google Docs vs the choice for Inertia) is in `docs/keyboard-shortcuts.md`, section "Planned bindings".

## Acceptance criteria

- Rebind the editor to the map above works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Branch `backlog/rebind-editor-shortcuts-to-apple-notes-map`, rebuilt on current main from the 2026-10-19 branch and a cut-off attempt. Done: one table (`frontend/src/data/editorShortcut.ts`) that the editor, the `⌘/` sheet, the toolbar tooltips and `docs/keyboard-shortcuts.md` read, with a test that fails if the doc drifts; bound `⌘⇧X` strikethrough, `⌘⇧7` bulleted, `⌘⇧9` numbered, `⌘⇧L` checklist, `⌘⇧U` mark done, `⌘]` / `⌘[` indent and outdent, `⌃⌘↑` / `⌃⌘↓` move a list item, `⌘⇧M` code block, `⌘\` clear formatting; the replaced TipTap defaults are dropped. Feature doc: `docs/features/editor_shortcuts.md`. The file stays because the checks below could not run here.

Decision by Alex (2026-11-09), applied: the code block and the Monospace paragraph style are the same thing, so the code block takes Notes' own `⌘⇧M`. The temporary `⌘⌥⇧C` is gone, and the `RESERVED_KEYS` guard on `⌘⇧M` is lifted for this one key (`data/editorShortcut.test.ts` pins it). **Merge hazard:** `backlog/paragraph-style-shortcuts` also binds `⌘⇧M`, to the Monospace style. When it merges, the Monospace style must BE the code block, not a second thing on the same key; that unification, plus a language menu and syntax highlighting, is the backlog task `code-blocks-with-language-and-syntax-highlighting` (already on `main`; no new task). Until then `⌘⇧M` makes a code block and Monospace paragraphs stay a separate style. Chrome on a Mac keeps `⌘⇧M` for its profile menu, so check it reaches the page.

Other decisions for Alex (conservative versions built):
- Notes' `⌘⇧T` / `⌘⇧H` / `⌘⇧J` / `⌘⇧B` (Title, Heading, Subheading, Body) are not bound: they would duplicate the style keys, `⌘⇧T` / `⌘⇧J` also trigger the global New task / New idea, and browsers keep them.
- Not built, left to their tasks or to a decision: dashed list `⌘⇧8` (`dashed-list-block`), `⌘K` link and `⌥⌘T` table (both clash with global keys: `editor-vs-global-shortcut-clashes`), alignment and superscript / subscript (each needs an extension, an attribute and the collab schema, and `⌘⇧E` / `⌘⇧J` also clash with the global keys), comment (`comments-on-documents`). Windows / Linux and the Mac Format menu keep their own tasks.

Ran (offline Jest stand-in and static checks, again after the 2026-11-09 `⌘⇧M` change): the static checker, `data/editorShortcut.test.ts`, `util/editorKeymap.test.ts` and `util/editorCommand.test.ts` (all passed).

Not run (no network, node_modules or browser): `npm run lint`, `npx tsc -b`, the real Jest suite, and `extensions/EditorShortcuts.test.ts`, which drives a real TipTap editor with keydown events and has never run, so its key events may need adjusting. To verify:

```sh
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser (Safari, Chrome, Firefox) and the Mac app, in a document, press each key in the table in `docs/keyboard-shortcuts.md` (Document editor): lists on and off, nesting with `⌘]` / `⌘[`, `⌃⌘↑` / `⌃⌘↓` on bulleted, numbered and checklist items with the cursor staying in the item, `⌘⇧U` on a saved checklist line (and on an unsaved one), `⌘\` on a heading and a styled paragraph, and that `⌘⇧S`, `⌘⇧8`, `⌥⌘C` and `⌘⌥⇧C` no longer do anything and `⌘⇧M` toggles a code block (also in Chrome on a Mac). Check whether the browser keeps `⌘[`, `⌘]` (Back and Forward) or Safari's `⌘⇧L`, open `⌘/` at 375px and on a short desktop window (the sheet scrolls), in light and dark.

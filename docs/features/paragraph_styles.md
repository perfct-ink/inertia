# Paragraph styles

## What it does
The document toolbar has a "Paragraph style" menu. It shows the style of the block the cursor is in and applies another to it. Built-in styles: **Title**, **Subtitle**, **Heading 1**, **Heading 2**, **Heading 3**, **Body**, **Quote**, **Caption** and **Monospace**. Headings are real heading nodes (levels 1 to 3, and so appear in the outline); the others are paragraphs with a `style` attribute (title, subtitle, quote, caption, monospace; absent or body is a plain paragraph) with their own look in `ProseMirror.scss`. The menu shows "Style" when the cursor is in something that isn't a styled paragraph or heading 1 to 3 (lists, code blocks, deeper headings). The document's own title is still its first heading.

## API and models
No endpoint. Styles are stored in the document content as the paragraph's `style` attribute. `StyledParagraph` (`frontend/src/extensions/StyledParagraph.ts`) adds it, mirrored in `collab-server/src/schema.ts` so collaboration keeps it; the style list and `styleOfBlock` are in `frontend/src/data/paragraphStyle.ts`; the menu is `components/ParagraphStylePicker.tsx`.

## Keyboard shortcuts
The built-in styles have `⌘⌥` plus a digit (`Ctrl+Alt` on Windows and Linux): **Title** `⌘⌥7`, **Subtitle** `⌘⌥8`, **Heading 1 to 3** `⌘⌥1` to `⌘⌥3`, **Body** `⌘⌥0`, **Quote** `⌘⌥9`. Caption and Monospace have no default key (see `docs/keyboard-shortcuts.md` for why, and for the clashes checked against the Apple Notes map). The headings keep TipTap's own keys, which toggle the heading; the others set the style on the block at the cursor, like the menu does, and do nothing in a block that can't take it (the document's first block stays a heading). The table is `PARAGRAPH_STYLE_SHORTCUTS` in `frontend/src/data/paragraphStyleShortcut.ts`; `extensions/ParagraphStyleShortcuts.ts` binds it through `paragraphStyleKeymap` in `util/paragraphStyleCommand.ts`, whose `applyParagraphStyle` does the same as the menu's `apply` (the menu has its own copy so as not to touch the picker). The `⌘/` cheat sheet and the menu do not show these keys yet.

## Who can view and change
Anyone who can edit the document. Styles are shared with everyone who opens it (not per user).

## Tests
`frontend/src/data/paragraphStyle.test.ts`, `frontend/src/components/ParagraphStylePicker.test.tsx` (with a fake editor). Shortcuts: `frontend/src/data/paragraphStyleShortcut.test.ts` (no duplicate or reserved keys, no clash with other editor keys, the keyboard shortcuts doc lists every key) and `frontend/src/util/paragraphStyleCommand.test.ts` (each key applies its style, through a fake editor chain).

## Known limits
- No custom styles, per-user style lists or editing a style (`docs/backlog/create-a-custom-style.md` and the tasks after it), and no keyboard shortcuts for Caption and Monospace (the other styles have them, see above; users choosing their own is `paragraph-style-keystrokes`).
- Heading buttons H1 to H5 remain beside the menu; H4 and H5 have no menu entry.
- Applying a style to several blocks at once, and styles inside list items or table cells, were not tried. Existing documents are unaffected (no `style` means body).
- The collab server must be deployed with the schema change before styled paragraphs sync.

## History
- Implemented 2026-10-19 on branch `backlog/built-in-paragraph-styles` (covers the built-in styles and the style picker). Not merged or deployed.
- Not verified: lint, type-check, tests, the collab-server schema test and the editor were not run (no frontend node_modules; no vitest in collab-server).

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Shortcuts implemented 2026-11-05 (not deployed; on branch `backlog/paragraph-style-shortcuts`). Not implemented: shortcuts for Caption and Monospace, showing the keys in the menu or the `⌘/` sheet, Windows and Linux key checks (`Ctrl+Alt` digits are AltGr on some keyboard layouts). Not verified: lint, type-check, the editor and every keystroke in a browser (including whether Safari, Chrome or Firefox pass `⌘⌥7`, `⌘⌥8` and `⌘⌥9` to the page). Ran only the stand-in runner's checks (see the task file's Blocked note).

# Dashed list

## What it does
Apple Notes' third list style: a bullet list whose items start with a dash (an en dash) instead of a dot.
- The document toolbar has a **Dashed list** button between "Bullet list" and "Numbered list" (a list with three short dashes; the tooltip and accessible name are "Dashed list"). It is a real button, so it is reached with Tab and pressed with Enter or Space, and `aria-pressed` is true while the cursor is in a dashed list. There is no separate list menu in the editor; the toolbar buttons are the list controls.
- Clicking it works like the other list buttons: on a paragraph it makes a dashed list; in a **bullet list** it changes that list to dashed in place; in a **numbered list** it converts it; in a dashed list it takes the item out of the list (like the Bullet button in a bullet list). The Bullet button in a dashed list changes it back to plain bullets. Only the list the cursor is in changes, not a list around it.
- Typing `– ` (an en or em dash, then a space) at the start of a line starts a dashed list (macOS turns `--` into an en dash while typing, if smart dashes are on). Typing `- `, `+ ` or `* ` still starts a normal **bullet** list, as before; a plain hyphen is never turned into a dashed list. Backspace right after either undoes the rule.
- Tab and Shift+Tab indent and outdent items as in any list; an item indented into a new nested list keeps the dashed style (a nested list that already has other items keeps its own style). Enter, nesting and the Bullet and Numbered buttons behave as before.
- A new list joins the list directly above or below it only when it has the same style, so a bullet list typed under a dashed list stays a separate list.
- The key for it is not bound yet (see below).

## API and models
No endpoint. A dashed list is a `bulletList` node with a `listStyle` attribute (`"bullet"` default, or `"dashed"`) in the document content, so everything that reads a document as a bullet list (Tab/Shift+Tab, Quip import output, a future Markdown export, which writes `- ` for both styles) keeps working, and browser tabs or servers that predate the attribute drop it and show plain bullets instead of failing. Documents saved before it have no attribute and are plain bullet lists.
- `DashedList` and `StyledListItem` in `frontend/src/extensions/DashedList.ts` replace the stock `BulletList` and `ListItem` in `DocumentScreen.tsx`. They add the attribute (HTML: `data-list-style="dashed"` and `role="list"`, read back on paste), the `toggleDashedList` command, a `toggleBulletList` that is style aware, the typing rules, and Tab keeping the style.
- Pure rules (style values, what a click does in each kind of list, nested style) are in `frontend/src/data/listStyle.ts`.
- The dash is drawn in CSS (`ul[data-list-style='dashed']` in `view/document/ProseMirror.scss`, an en dash in a `::before`, no `::marker` because Safari ignores its `content`), so it cannot be selected and takes the text colour in light and dark.
- **Collab server:** `collab-server/src/schema.ts` mirrors the attribute and its default. The collab server is deployed together with the frontend (same stack), and both must go out in the same release: an older collab server drops `listStyle` when it seeds a document from Rails' JSON, so dashed lists would turn into plain bullets for everyone the next time the document is opened.
- The toolbar button is `components/DashedListButton.tsx`; the shared toolbar button it and `DocumentScreen.tsx` use is `components/DocumentToolbarButton.tsx` (moved out of `DocumentScreen.tsx` unchanged).

## Where to bind a key later
`LIST_SHORTCUTS` at the top of `frontend/src/extensions/DashedList.ts` is the only place editor keys for the list buttons live: `{ bullet: 'Mod-Shift-8', dashed: null }`. The shortcut rebind task (`backlog/rebind-editor-shortcuts-to-apple-notes-map`, Apple Notes: `⌘⇧8` dashed, `⌘⇧7` bullets) changes the two values there, adds the key to the button's `title`, and moves the row in `docs/keyboard-shortcuts.md` from "Planned bindings" to the table above it. This feature does not touch `docs/keyboard-shortcuts.md`.

## Who can view and change
Anyone who can edit the document. The style is stored in the document and shared with everyone who opens it.

## Tests
- `frontend/src/data/listStyle.test.ts` (pure rules; run).
- `frontend/src/extensions/DashedList.test.ts` (a real TipTap editor: HTML in and out, the toggle in each kind of list, nested lists, joining, Tab, the typing rules; not run here).
- `frontend/src/components/DashedListButton.test.tsx` (name, tooltip, pressed state, click; run).
- `collab-server/test/schema.test.ts` (the attribute and its default; not run here).

## Known limits
- The cursor's list decides the action: with a selection across several list items only the list at the start of the selection changes style.
- Converting between bullet and dashed on a selection of several paragraphs is the same as the other list buttons (one new list); a selection spanning two lists was not tried.
- Smart dashes (`--` becoming an en dash) depend on the operating system's text settings; the toolbar button always works.
- No Markdown or plain-text export of documents exists in the app, so the `- ` export is not exercised.
- Not seen in a browser: the dash position and alignment, light and dark, 375px width, and collaboration with two people editing a dashed list.

## History
- Implemented 2026-11-09 on branch `backlog/dashed-list-block`, built from the backlog item with Alex's decisions (a toolbar button now, the key later). Not merged or deployed.
- Not verified: lint, type-check, the extension test and collab-server test (no node_modules, no TipTap installed here), and the editor in a browser. The data and toolbar button tests and the static checks were run with the offline stand-in.

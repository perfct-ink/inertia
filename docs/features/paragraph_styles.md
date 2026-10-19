# Paragraph styles

## What it does
The document toolbar has a "Paragraph style" menu. It shows the style of the block the cursor is in and applies another to it. Built-in styles: **Title**, **Subtitle**, **Heading 1**, **Heading 2**, **Heading 3**, **Body**, **Quote**, **Caption** and **Monospace**. Headings are real heading nodes (levels 1 to 3, and so appear in the outline); the others are paragraphs with a `style` attribute (title, subtitle, quote, caption, monospace; absent or body is a plain paragraph) with their own look in `ProseMirror.scss`. The menu shows "Style" when the cursor is in something that isn't a styled paragraph or heading 1 to 3 (lists, code blocks, deeper headings). The document's own title is still its first heading.

## API and models
No endpoint. Styles are stored in the document content as the paragraph's `style` attribute. `StyledParagraph` (`frontend/src/extensions/StyledParagraph.ts`) adds it, mirrored in `collab-server/src/schema.ts` so collaboration keeps it; the style list and `styleOfBlock` are in `frontend/src/data/paragraphStyle.ts`; the menu is `components/ParagraphStylePicker.tsx`.

## Who can view and change
Anyone who can edit the document. Styles are shared with everyone who opens it (not per user).

## Tests
`frontend/src/data/paragraphStyle.test.ts`, `frontend/src/components/ParagraphStylePicker.test.tsx` (with a fake editor).

## Known limits
- No custom styles, per-user style lists or editing a style (`docs/backlog/create-a-custom-style.md` and the tasks after it), and no keyboard shortcuts for the new styles (`paragraph-style-shortcuts`).
- Heading buttons H1 to H5 remain beside the menu; H4 and H5 have no menu entry.
- Applying a style to several blocks at once, and styles inside list items or table cells, were not tried. Existing documents are unaffected (no `style` means body).
- The collab server must be deployed with the schema change before styled paragraphs sync.

## History
- Implemented 2026-10-19 on branch `backlog/built-in-paragraph-styles` (covers the built-in styles and the style picker). Not merged or deployed.
- Not verified: lint, type-check, tests, the collab-server schema test and the editor were not run (no frontend node_modules; no vitest in collab-server).

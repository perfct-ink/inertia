# Paragraph styles

## What it does
The document toolbar has a "Paragraph style" menu. It shows the style of the block the cursor is in and applies another to it. Built-in styles: **Title**, **Subtitle**, **Heading 1**, **Heading 2**, **Heading 3**, **Body**, **Quote**, **Caption** and **Monospace**. Headings are real heading nodes (levels 1 to 3, and so appear in the outline); the others are paragraphs with a `style` attribute (title, subtitle, quote, caption, monospace; absent or body is a plain paragraph) with their own look in `ProseMirror.scss`. The menu shows "Style" when the cursor is in something that isn't a styled paragraph or heading 1 to 3 (lists, code blocks, deeper headings). The document's own title is still its first heading.

**My styles.** A person can make their own styles. "New style…" at the bottom of the menu opens a form that starts from the paragraph the cursor is in: a name (up to 40 characters, not a built-in style's name, not one they already have), the built-in style it builds on (Body, Title, Subtitle, Quote, Caption or Monospace), and optional font (sans-serif, serif, monospace), size (12 to 48 px from a list), weight, line spacing, alignment and colour (a set of swatches). Anything left on "Default" comes from the base style. Saving applies the style to the paragraph, and the style appears under "My styles" in the menu of every document for that person only, other people don't see it in their menu. A paragraph in a custom style shows that style in the menu; if someone else's custom style is under the cursor, the menu shows "Style".

## API and models
- Built-in styles have no endpoint. They are stored in the document content as the paragraph's `style` attribute. `StyledParagraph` (`frontend/src/extensions/StyledParagraph.ts`) adds it, mirrored in `collab-server/src/schema.ts` so collaboration keeps it; the style list and `styleOfBlock` are in `frontend/src/data/paragraphStyle.ts`; the menu is `components/ParagraphStylePicker.tsx`.
- Custom styles: `paragraph_styles` table (`user_id`, `name`, `base`, `properties` json, unique per user and name ignoring case; migration `20261105060001`). `ParagraphStyle` (`backend/app/models/paragraph_style.rb`) validates the name, the base and each property (font, size 8 to 96, weight 400/500/600/700, `#rrggbb` colour, spacing 1.0 to 3.0, alignment), drops blank properties, and caps a person at 50. They belong to the person, not to a Space.
  - `GET /api/v1/paragraph_styles`: the signed-in person's own styles, oldest first. `POST /api/v1/paragraph_styles` (`{ paragraph_style: { name, base, properties } }`): 201, or 422 with `errors`. Formatting keys the model doesn't know are ignored. Any signed-in user; the Space header is ignored.
  - A paragraph that uses one stores `style: "custom-<id>"` and `styleProps`, a copy of the style's resolved formatting (`{ base, size, color, ... }`). The copy is what is drawn (`extensions/CustomParagraphStyle.ts`: inline CSS plus `data-style-base`, with the base look in `ProseMirror.scss`), so the paragraph looks the same to everyone, with or without the style, whatever happens to it later. `styleProps` is mirrored in `collab-server/src/schema.ts`.
  - Because a document can hold values written by another person, the copy is only drawn while `style` is a custom reference, and only through `sanitizeSnapshot` (`data/customParagraphStyle.ts`), which keeps just the allowed properties and values; nothing else reaches the page's CSS or HTML. The allowed values exist in Ruby and TypeScript and must be kept in step.
  - Frontend: `data/customParagraphStyle.ts` (rules, snapshots, CSS, name check), `api/paragraphStyles.ts`, `components/CustomStyleDialog.tsx`.

## Who can view and change
Anyone who can edit the document applies any style to its paragraphs. A custom style is private to its creator's menu, but a paragraph that uses it carries its formatting, so everyone who opens the document sees it.

## Tests
`frontend/src/data/paragraphStyle.test.ts`, `frontend/src/components/ParagraphStylePicker.test.tsx` (with a fake editor; including My styles, choosing one, and New style), `frontend/src/components/CustomStyleDialog.test.tsx`, `frontend/src/data/customParagraphStyle.test.ts`, `frontend/src/extensions/CustomParagraphStyle.test.ts` (needs TipTap, not run offline), `backend/test/models/paragraph_style_test.rb`, `backend/test/controllers/paragraph_styles_controller_test.rb`, `collab-server/test/schema.test.ts`.

## Known limits
- A custom style can be created only: no editing, renaming or deleting, no styles shared across people or global ones, and no sharing of a style with a shared document's other readers beyond the formatting each paragraph carries (`docs/backlog/custom-styles-are-per-user-and-global.md`, `edit-or-delete-custom-style.md`, `custom-styles-in-shared-documents.md`). Changing a style later wouldn't change paragraphs already using it (they hold their own copy).
- Custom styles can't build on headings, only on the paragraph styles, and a style can't set an arbitrary colour, font size or font beyond the lists in the form.
- Keyboard shortcuts for the built-in styles are a separate task (`paragraph-style-shortcuts`); none for custom styles (`paragraph-style-keystrokes`).
- Heading buttons H1 to H5 remain beside the menu; H4 and H5 have no menu entry.
- Applying a style to several blocks at once, and styles inside list items or table cells, were not tried. Existing documents are unaffected (no `style` means body).
- The collab server must be deployed with the schema changes (the `style` attribute, and `styleProps` for custom styles) before those paragraphs sync.

## History
- Implemented 2026-10-19 on branch `backlog/built-in-paragraph-styles` (covers the built-in styles and the style picker). Not merged or deployed.
- Not verified: lint, type-check, tests, the collab-server schema test and the editor were not run (no frontend node_modules; no vitest in collab-server).

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Custom styles (creating them) added 2026-11-05 on branch `backlog/create-a-custom-style` (not merged or deployed). Not verified: `rails db:migrate` (`schema.rb` was edited by hand), `rails test`, `npm run lint`, `tsc -b`, the real Jest suite, the collab-server tests, the TipTap extension test, and the form and menu in a browser (375px and desktop, light and dark). What ran: the static checker, the pure data tests, and in a Jest stand-in the picker, form and data tests.

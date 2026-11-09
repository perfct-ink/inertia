---
priority: p1
depends_on: []
branch: backlog/custom-paragraph-styles
status: incomplete
---
# Custom paragraph styles

## Objective

**Create a custom style** from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it

## Requirements / notes

Merged from four tasks (Alex, 2026-11-09 groom): create, per-user storage, edit/delete, and shared documents.

- **Create** a style from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it. It joins the paragraph style picker.
- **Per user and global:** saved to the user's account and available in every document they edit. Default: a `paragraph_styles` table keyed to `user_id`; rendered as a Tiptap attribute on the block, e.g. `data-style="my-callout"`.
- **Edit or delete** a style; documents that use it update. A deleted style renders as Body.
- **Shared documents:** since styles belong to one user, collaborators need to see the same thing. Default: the doc stores the resolved formatting with the style name, so it looks the same to everyone; only the owner's picker lists the style.

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today (checked 2026-11-09): documents have built-in paragraph styles and a picker (Title, Subtitle, Headings, Body, Quote, Caption, Monospace; `docs/features/paragraph_styles.md`). There are no user-made styles.

## Acceptance criteria

- Custom paragraph styles work as described in the Objective and Requirements, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Built on this branch (2026-11-09)

Built from the merged spec, starting from the older branch `backlog/create-a-custom-style` (Alex can delete that branch; this one supersedes it): create from the current paragraph, per-user storage, edit and delete, and shared documents. The feature doc is `docs/features/paragraph_styles.md` (extended); it describes the behaviour as built.

Choices made for Alex (the conservative way to combine "edit updates documents" with "the doc stores the resolved formatting"):

- A paragraph keeps `style` = `custom-<id>` plus a copy of the style's name (`styleName`) and resolved formatting (`styleProps`, JSON `{owner, base, properties}`). It is drawn from the copy alone, so it looks the same to everyone and nothing is fetched to draw it. This replaces the older branch's "reference only, read the definition from a per-document endpoint", so the `GET /documents/:id/paragraph_styles` endpoint and the "In this document" menu group are gone: only the owner's menu lists a style, and nobody can read another person's style list.
- The owner's editor keeps the copies fresh: when they edit a style the copies in the documents they open take the new name and formatting; when they delete one, those paragraphs become Body. The server touches no document. Rewrites happen only after a fresh fetch of the list (never on a cached list, which could make a style made in another tab look deleted), only in an editable document, and only for styles whose copy names the signed-in person as owner. Others see the last copy until the owner next opens the document (no "restyle everything now").
- A new style starts from the style of the paragraph under the cursor (built-in base, or a custom style's formatting; a heading starts from Body), because the editor has no per-paragraph font, size or colour of its own to measure.
- Edit and delete live in a "Manage styles…" list in the same menu (Edit reuses the new-style form; Delete asks first).

Schema changes to list: `paragraph_styles` table (migration `20261108170001_create_paragraph_styles`); collab-server paragraph attributes `styleName` and `styleProps` (`collab-server/src/schema.ts`). **Deploy the collab server with the frontend**: an older collab server drops those attributes from documents it saves.

Compatibility with `backlog/paragraph-style-shortcuts` (not stacked on it, both change `ParagraphStylePicker.tsx` and `DocumentScreen.tsx`): that branch moves the picker's `apply` into `util/paragraphStyleCommand.ts` as `applyParagraphStyle`. When both merge, `applyParagraphStyle` should also set `styleName: null, styleProps: null` (use `NO_CUSTOM_COPY` from `data/customParagraphStyle.ts`) so switching a custom paragraph to a built-in style drops the copy; if it doesn't, nothing breaks, because a paragraph is only drawn from a copy when its `style` is a `custom-<id>` and the next refresh ignores a leftover copy. Resolve the two picker conflicts by keeping both sets of imports and options. `paragraph-style-keystrokes` (depends on this task) is not built.

## Unverified

No network, `node_modules`, database or Docker here, so none of the real suites ran. Ran: `JEST_STUB_NET=1 /tmp/runner/all.sh` (static checks, the pure data and util tests) and the Jest stand-in for `ParagraphStylePicker`, `CustomStyleDialog`, `CustomStylesDialog`, `useCustomStyleSync` and `customParagraphStyleCommand` (passed); `ruby -c` on the backend files. Not run: `rails db:migrate` (`schema.rb` was edited by hand: check `git diff db/schema.rb` is empty afterwards), `rails test`, the real Jest suite (including `extensions/StyledParagraph.test.ts`, which needs real TipTap), `npm run lint`, `tsc -b`, the collab-server vitest, and a browser look.

To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
cd collab-server && npm install && npm test
```

Then in a browser (375px and desktop, light and dark): make a style from a Quote paragraph and see it in the menu of another document; edit it in Manage styles… and watch the open document and a second one follow; delete it and see the paragraphs turn into Body; open the document as a collaborator (second account in the same Space) and check the paragraph looks the same and the style is not in their menu; paste a styled paragraph into another document; check the console for errors. Also check that `PATCH /api/v1/paragraph_styles/:id` with `properties: {}` clears the formatting (the controller test covers it, but it was not run).

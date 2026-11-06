---
priority: p1
depends_on: [style-picker]
branch: backlog/create-a-custom-style
---
# Create a custom style

## Objective

**Create a custom style** from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- Create a custom style works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on `backlog/create-a-custom-style`, not merged because Rails, lint, the type-check, the collab-server tests and a browser could not run on the machine that finished it.

Done: a person's own styles (`paragraph_styles`, migration `20261105060001`; `GET` and `POST /api/v1/paragraph_styles`, validated, 50 per person), a "New style…" form in the paragraph style menu that starts from the paragraph under the cursor (name, the built-in style it builds on, font, size, weight, line spacing, alignment, colour), a "My styles" group in the menu in every document, and paragraphs that carry a copy of their style's formatting (`styleProps`, drawn only through a sanitiser) so they look the same to everyone. Tests and `docs/features/paragraph_styles.md` are written. Only creating is built; per-user vs global lists, editing and deleting, sharing and keystrokes are the follow-up tasks.

Ran: the static checker, `customParagraphStyle.test.ts`, and `ParagraphStylePicker.test.tsx`, `CustomStyleDialog.test.tsx` in a Jest stand-in (all passed). Not run: `rails test` (new `paragraph_style_test.rb` and `paragraph_styles_controller_test.rb`), `CustomParagraphStyle.test.ts` (needs TipTap), the collab-server tests.

Not run, to do before merging:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # edited by hand; the diff should be empty
cd backend && rails test
cd collab-server && npm install && npm test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Deploy the collab server before (or with) the frontend, or paragraphs with `styleProps` won't sync. Then in a browser at 375px and desktop, light and dark: make a style from a quote paragraph, apply it in two documents, open one as another person, and try a taken name.

Merge notes: `backlog/paragraph-style-shortcuts` also edits `ParagraphStylePicker.tsx` (its `apply` becomes `applyParagraphStyle`; keep that and add the custom-style branch on top) and `DocumentScreen.tsx`. When this merges, delete this file.

Decisions for Alex: a custom style is a copy at the time it is applied (later edits won't restyle old paragraphs, which the edit task has to decide), and styles can build on the paragraph styles only, not on headings.

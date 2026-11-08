---
priority: p1
depends_on: []
branch: backlog/create-a-custom-style
status: incomplete
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

Done: a person's own styles (`paragraph_styles`, migration `20261105060001`; `GET` and `POST /api/v1/paragraph_styles`, validated, 50 per person), a "New style…" form in the paragraph style menu that starts from the paragraph under the cursor (name, the built-in style it builds on, font, size, weight, line spacing, alignment, colour), a "My styles" group in the menu in every document, and, by Alex's call (2026-11-06), a document that stores only a reference (`style: "custom-<id>"`). Every browser that opens the document fetches the definitions (`GET /api/v1/documents/:id/paragraph_styles`) and the editor draws each paragraph from its style through a decoration, so editing a style will restyle every paragraph that uses it. The collaboration server's schema is unchanged. Tests and `docs/features/paragraph_styles.md` are written. Only creating is built; per-user vs global lists, editing and deleting, view-only links and keystrokes are the follow-up tasks.

Privacy choice (conservative, Alex to confirm): a style's name and formatting are readable only by someone who can open a document that uses it, found from the document's saved content, and by its creator. The other option (readable by everyone who shares a Space with the creator) is simpler with live collaboration but exposes more. Cost of the strict choice: the saved content lags the editor by a few seconds, so a collaborator may see a brand-new style plain for a moment (the browser asks again every five seconds, up to six times), and a view-only link without an account would see styles plain.

Ran: the static checker; `customParagraphStyle.test.ts` (pure); `ParagraphStylePicker`, `CustomStyleDialog` and `useDocumentCustomStyles` tests in a Jest stand-in (all passed); `ParagraphStyle.referenced_ids` on a sample document in plain Ruby. Not run: `rails test` (the new model and controller tests), `CustomParagraphStyle.test.ts` (needs TipTap), the collab-server test.

Not run, to do before merging:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # edited by hand; the diff should be empty
cd backend && rails test
cd collab-server && npm install && npm test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: make a style from a quote paragraph, apply it in two documents, open one as another person in the same Space (they should see it drawn, and find it under "In this document"), edit nothing yet, and try a taken name. Open a document with a deleted or unknown style id: it should be plain.

Merge notes: `backlog/paragraph-style-shortcuts` also edits `ParagraphStylePicker.tsx` (its `apply` becomes `applyParagraphStyle`; keep that and add the custom-style branch on top) and `DocumentScreen.tsx`.

Decided by Alex (2026-11-06): the document holds a reference, and styles build on the paragraph styles only, not on headings.

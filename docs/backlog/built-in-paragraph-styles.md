---
branch: backlog/built-in-paragraph-styles
priority: p1
depends_on: []
components: [frontend]
---
# Built-in paragraph styles

## Objective

**Built-in paragraph styles**: Title, Subtitle, Heading 1–3, Body, Quote, Caption, Monospace

## Requirements / notes

Like the style menu in Quip, Google Docs and Pages.

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- Built-in paragraph styles works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
To verify: `cd frontend && npm install && npm run lint && npm test`, `cd collab-server && npm install && npm test`, then apply each style in a browser and in two collaborating sessions. None of that could run here. Deploy the collab server with the schema change first. Then remove this file and merge.

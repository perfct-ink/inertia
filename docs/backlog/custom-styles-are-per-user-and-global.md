---
priority: p1
depends_on: [create-a-custom-style]
components: [backend]
---
# Custom styles are per user and global

## Objective

**Custom styles are per user and global**: saved to the user's account and available in every document they edit

## Requirements / notes

Default: a `paragraph_styles` table keyed to `user_id` (or a JSON column on `users`). Rendered as a Tiptap attribute on the block, e.g. `data-style="my-callout"`.

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- Custom styles are per user and global works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

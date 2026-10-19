---
priority: p1
depends_on: [style-picker]
components: [frontend]
---
# Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1)

## Objective

Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1)

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

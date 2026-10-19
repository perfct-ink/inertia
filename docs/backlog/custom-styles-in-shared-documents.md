---
priority: p1
depends_on: [custom-styles-are-per-user-and-global]
---
# How other people see your custom styles in a shared document

## Objective

How other people see your custom styles in a shared document

## Requirements / notes

Open question: since styles belong to one user, a collaborator either sees the formatting copied into the doc, or the style travels with the doc. Default: the doc stores the resolved formatting so it looks the same to everyone.

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- How other people see your custom styles in a shared document works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

---
priority: p1
depends_on: []
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

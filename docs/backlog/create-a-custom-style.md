---
priority: p1
depends_on: []
---
# Create a custom style

## Objective

**Create a custom style** from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today (checked 2026-11-09): documents have built-in paragraph styles and a picker (Title, Subtitle, Headings, Body, Quote, Caption, Monospace; `docs/features/paragraph_styles.md`). There are no user-made styles.

## Acceptance criteria

- Create a custom style works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

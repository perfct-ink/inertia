---
priority: p1
depends_on: []
---
# Broken-link handling when a target doc or heading is deleted

## Objective

Broken-link handling when a target doc or heading is deleted

## Requirements / notes

Show the link as broken rather than removing it.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today (checked 2026-11-09): document and heading links exist through the heading link picker (`docs/features/heading_links.md`). Following a link to a deleted heading opens the document and shows "That heading is no longer in this document" after 6 s; nothing marks the link itself as broken beforehand, and a link to a deleted document isn't handled.

## Acceptance criteria

- Broken-link handling when a target doc or heading is deleted works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

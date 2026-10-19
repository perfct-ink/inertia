---
priority: p0
depends_on: []
components: [backend]
---
# Shareable read-only roadmap link (external stakeholders)

## Objective

Shareable read-only roadmap link (external stakeholders)

## Current state

`shares` table exists for documents

## Requirements / notes

Reuse the share mechanism.

## Context

Section "Product roadmap" of the retired shared backlog.

## Acceptance criteria

- Shareable read-only roadmap link (external stakeholders) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

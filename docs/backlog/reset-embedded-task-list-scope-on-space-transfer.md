---
priority: p3
depends_on: [embed-live-task-lists-in-documents]
components: [backend, documents]
---
# Reset an embedded task list's folder or sprint when a document changes Space

## Objective

When a document is copied or moved into another Space (`SpaceTransfer`), an embedded live task list (`taskEmbed` node, see `docs/features/embedded_task_lists.md`) that is scoped to one folder or one sprint keeps the old Space's id, which matches nothing in the new Space. The embed then shows an empty list until someone opens its settings and picks again. Nothing from the old Space is shown (the API scopes tasks to the reader's Space), but the result looks broken.

## Requirements

- In `SpaceTransfer`, next to `remap_task_ids`, walk the copied or moved content and set every `taskEmbed` node whose `scope` is `folder` or `sprint` back to `scope: "space"`, `scopeId: nil` when the target Space differs from the source Space. Leave `view` and `status` as they are, and leave embeds alone for a copy within the same Space.
- "This document" and "Whole Space" embeds need nothing (they store no id).

## Acceptance criteria

- A Minitest in `backend/test/services/space_transfer_test.rb` covers a cross-Space copy and move (scope reset), a same-Space copy (scope kept), and that other nodes are untouched.
- `docs/features/embedded_task_lists.md` loses the matching Known limit and `docs/features/space_transfer.md` mentions it; this file is removed.

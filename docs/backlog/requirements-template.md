---
priority: p0
depends_on: []
---
# Requirements template

## Objective

**Requirements template** for new feature docs (problem, goals, user stories, acceptance criteria, out of scope)

## Context

Section "Feature folders" of the retired shared backlog.

Requested by Alex on 2026-10-13. A feature folder holds a hierarchy of features, each written as a business or product requirements document. Tasks are created from those feature documents, and opening the project folder shows a rollup of all tasks under each feature.

```
Project folder            (click it: task rollup per feature)
└── Feature folder
    └── Feature           (requirements doc)
        └── Sub-feature   (requirements doc, any depth)
            └── Tasks created from the doc
```

Today: folders already nest to any depth (`folders.parent_id`, `Folder#self_and_descendant_ids`), documents live in folders, and tasks already carry `document_id` and `folder_id`. What is missing is a way to mark a folder or document as a feature, task creation from inside a feature doc, and the per-feature rollup.

## Acceptance criteria

- Requirements template works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

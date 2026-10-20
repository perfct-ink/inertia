---
branch: backlog/feature-hierarchy
priority: p0
depends_on: []
---
# Link features to the planning hierarchy (a feature can belong to an epic, initiative or milestone)

## Objective

Link features to the planning hierarchy (a feature can belong to an epic, initiative or milestone)

## Requirements / notes

Ties into the planning hierarchy (`docs/features/hierarchy_tree_view.md`).

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

- Link features to the planning hierarchy (a feature can belong to an epic, initiative or milestone) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on `backlog/feature-hierarchy` together with the other feature-folder tasks (one shared migration and rollup), stacked on `backlog/feature-folder-type`; merge that first. The initiative link comes from `backlog/document-initiative-and-dates` (not in this branch). To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then make a feature folder, add nested features with tasks and open the folder overview in a browser. None of that could run here. Then remove this file and merge.

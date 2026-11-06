---
priority: p2
depends_on: [features-with-requirements-docs]
components: [backend, frontend]
---
# Reconcile folder-flag features with epic features

## Objective

Two ideas of a "feature" now exist on main. One is a document in a feature folder (`folders.kind = feature`, `documents.parent_feature_id`, status, owner, planning links, folder rollup: `feature_hierarchy.md`, `feature_folders.md`). The other is an epic with a required requirements document (`feature_requirements_docs.md`), which is what Alex decided on 2026-10-23. Decide what becomes of the first.

## Requirements

- Choose: retire the folder-flag design, or fold its useful parts (nested features, owner, derived status, the folder rollup) into epics.
- If retired, migrate existing feature-folder documents into epics (each document becomes the requirements document of a new epic, keeping its tasks and parent) and remove the feature bar, rollup and "Make Feature Folder".
- Nesting of features under features needs an answer for epics (a parent epic), or is dropped on purpose.

## Acceptance criteria

- One concept of a feature is visible in the UI and the API.
- Existing data survives the change; a dry run reports what would move.
- The feature docs describe the result and this file is removed.

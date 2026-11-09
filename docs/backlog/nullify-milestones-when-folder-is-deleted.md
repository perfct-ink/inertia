---
priority: p2
depends_on: []
components: [backend]
---
# Deleting a folder that holds milestones

## Objective
Deleting a project or folder must not fail, or leave milestones pointing at it, when milestones are filed in it.

## Context
Milestones created in a project get its `folder_id` (`ProjectScoped#file_in_current_project`). `milestones.folder_id` is a plain foreign key to `folders` (no `on_delete`), and `Folder` has no `has_many :milestones`, unlike initiatives, sprints, ideas, objectives and the other planning records, which are nullified (database `on_delete: :nullify` plus `dependent: :nullify`). `FoldersController#destroy` calls `@folder.destroy`, so deleting a folder with a milestone in it looks like it raises a foreign-key error. Read from the code on 2026-11-09, not reproduced. `rails milestones:from_events` (see `docs/features/milestones_and_rollups.md`) files each copied milestone in its event's folder, so it makes this more likely.

## Requirements
- A migration changing the `milestones.folder_id` foreign key to `on_delete: :nullify` (compatible with the previous release), and `has_many :milestones, dependent: :nullify` on `Folder`, matching the other planning records.
- Decide whether a milestone whose project is deleted should be kept Space-wide (nullify, as the others) or deleted with it; nullify is the conservative default.

## Acceptance criteria
- Deleting a folder or project that has milestones succeeds and the milestones stay, with no folder.
- A folder model test and a folders controller test cover it.

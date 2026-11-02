---
priority: p3
depends_on: [move-or-copy-content-between-spaces]
components: [backend]
---
# Move folder-attached records between Spaces

## Objective

Let a folder move to another Space even when tasks, events, epics or milestones are attached to it directly, and let a copy bring them along.

## Requirements / notes

- Today `SpaceTransfer#move_folder` refuses a folder (or any subfolder) that has tasks, events, epics or milestones with `folder_id` pointing at it, because they belong to the old Space (see `docs/features/space_transfer.md`). A copy leaves them behind.
- Decide, per record type, what happens: move the record with the folder (clearing links that only make sense in the old Space, as the document task move does), or detach it (`folder_id` null) after telling the user how many will be detached.
- Epics and milestones roll tasks up across folders; moving one drags in or cuts links to tasks, initiatives and sprints in the old Space. The call on which links are cut is the owner's.

## Acceptance criteria

- A folder with attached records moves (and copies) with the behaviour chosen above, in one transaction.
- The dialog tells the user beforehand what will be moved, copied or detached.
- Tests cover each record type; `docs/features/space_transfer.md` is updated and this file is removed.

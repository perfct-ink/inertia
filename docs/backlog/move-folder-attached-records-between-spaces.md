---
priority: p3
depends_on: [move-or-copy-content-between-spaces]
components: [backend]
branch: backlog/move-folder-attached-records-between-spaces
status: incomplete
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

## Blocked

Built the conservative option, because which links to cut is the owner's call. Alex should confirm or change it:
- A move **detaches** every record filed directly under the folder or its subfolders (tasks, events, epics, milestones, initiatives, sprints, ideas, objectives, objectives map items, releases, project requests): they stay in the old Space with their folder cleared. Nothing is dragged across Spaces and no epic, milestone, initiative or sprint link is cut. A copy leaves them behind. The dialog counts them beforehand (`GET /api/v1/folders/:id/attached_records`).
- Allocations cannot be detached (`folder_id` is required), so a project with any is still refused. A folder's task status settings move with it.
- The kinds beyond the four named in this task (initiatives, sprints, ideas, objectives, objectives map items, releases, project requests, allocations, status settings) were found by checking every table with a folder column; before this change a move left their `folder_id` pointing across Spaces.
- Moving the records instead (clearing epic, sprint, milestone and initiative links as the document task move does) is the alternative; it would replace `detach_attached_records!` in `backend/app/services/space_transfer.rb` and the dialog wording in `frontend/src/data/transfer.ts`.

Done: service, controller action and route, dialog notice, tests, `docs/features/space_transfer.md`. Newly found work: `docs/backlog/cut-release-links-when-a-document-moves-between-spaces.md`.

Checks that did not run (no network, `node_modules` or database here): `rails test` (the Minitest tests were written, not run), `npm run lint`, `tsc -b`, a browser check at 375px and desktop, light and dark. Ran: `ruby -c` on the changed Ruby, `/tmp/runner/all.sh` (static checks and the pure data tests, including the new `data/transfer.test.ts` cases), and the dialog's Jest tests with the offline stand-in (12 of 13 passed; the 13th, "a refused transfer shows why", fails only because the stand-in stubs axios so `isAxiosError` is false).

To verify and merge: `cd backend && rails test test/services/space_transfer_test.rb test/controllers/space_transfer_controller_test.rb`, then `rails test`; `cd frontend && npm run lint && npx tsc -b && npm test`; then in a browser move and copy a folder that has a loose task and an event (and a project with an allocation) at 375px and desktop, light and dark. No migration is needed. Then delete this file in the merge.

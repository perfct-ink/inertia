# Move or copy between Spaces

## What it does
A document, sheet, Collection or folder can be moved or copied into a folder of another Space. In the sidebar tree, right-click a document or folder (or tap its ⋮ button on a touch device) and choose "Move to Space…" or "Copy to Space…". A dialog explains what will happen, asks for the Space and a folder in it (the Space's Root is listed as "Top level", other folders by their path such as "Messages / Design"), and then moves or copies. When it is done the dialog says so and offers "Open in <Space>", which switches to that Space and opens the item. The menu items are hidden when there is nowhere to send things: the Root folder has none, and neither does a user who can only read the current Space or who belongs to no other Space they can write in.

What goes with a **document**, sheet or Collection:
- Its content, title and type. Collection fields, records and values are copied or moved with it.
- The Space tasks made from its checklist lines (and any other task with that `document_id`), with subtask nesting.
  - **Copy:** the tasks are duplicated (title, description, status, dates, order) and the copied checklist lines point at the copies. An assignee is kept only if they are a member of the destination Space. Epic, sprint, milestone, folder, dependencies, event links and AI runs are not copied. A checklist line whose task no longer exists loses its link, so the editor makes a fresh task for it the next time the copy is edited and saved (see `docs/features/document_task_lines.md`).
  - **Move:** the same task rows move to the destination Space. Their epic, sprint, milestone, folder, Gantt dependencies, event links and AI runs are removed, as is an assignee who is not a member of the destination. A subtask left behind in the old Space loses its parent, and a moved task whose parent stays behind loses its parent.
- Public share links to a moved document keep working (the document is the same record). A copy has no share links. A copy is unpinned and its creator is the person who copied it; a moved document keeps its creator and pin.

What goes with a **folder** (a project is a folder): the folder, every subfolder (archived ones too) and every document in them, handled as above. A copy keeps each folder's name, kind (folder or project), dependency mode, position and archived state. A move changes the workspace of the whole subtree and puts the folder under the chosen folder.

**Records filed directly under a folder** (not through a document) belong to the old Space and are never dragged across: tasks, events, epics, milestones, initiatives, sprints, ideas, objectives, objectives map items, releases and project requests. This is the cautious choice (which links to cut is the owner's call):
- **Move:** each of them stays in the old Space with its folder cleared (`folder_id`, or `project_id` for a project request, set to null). Nothing is deleted and no task, initiative or sprint link is touched. The dialog says beforehand how many of each kind will be detached ("The move detaches 2 tasks and 1 event filed directly under this folder or its subfolders. They stay in this Space."), counting the whole subtree. Tasks of the folder's documents are not counted, since they move with their documents.
- **Copy:** they are left behind in the original and the dialog says so ("The copy leaves behind ...").
- **Allocations** (a person's weekly hours on a project) cannot be detached, so a project that has any is not moved: the dialog explains and disables Move, and the server refuses with a 422. A copy leaves them behind.
- A folder's own task status settings (renamed or recoloured statuses) move with it. A copy does not copy them.

Collections link to each other (relation fields) and a link cannot cross Spaces. A Collection is therefore copied or moved only together with the Collections it links to or is linked from (for example by copying or moving their folder). A copy inside one folder transfer has its links re-pointed at the copies. A Collection with a link to one that is not part of the transfer is refused with an explanation; copying it inside the same Space keeps the link to the original.

Every transfer runs in one database transaction: it completes, or both Spaces are left as they were.

## API and models
No new tables or columns. `SpaceTransfer` (`backend/app/services/space_transfer.rb`) does the work; `SpaceTransferable` (`backend/app/controllers/concerns/space_transferable.rb`) checks the destination for the two controllers.

```
POST /api/v1/documents/:id/copy   { target_folder_id }   # 201 { workspace_id, document }
POST /api/v1/documents/:id/move   { target_folder_id }   # 200 { workspace_id, document }
POST /api/v1/folders/:id/copy     { target_folder_id }   # 201 { workspace_id, folder }
POST /api/v1/folders/:id/move     { target_folder_id }   # 200 { workspace_id, folder }
GET  /api/v1/workspaces/:id/folders                       # one Space's active folders, flat, with `root` and `parent_id`
GET  /api/v1/folders/:id/attached_records                 # { detach: { tasks: 2, ... }, blocked: { resource_allocations: 1 } }
```

`attached_records` counts the records filed directly under the folder and its subfolders (`SpaceTransfer.attached_summary`); only kinds that have records appear. `detach` is what a move clears and a copy leaves behind, `blocked` is what stops a move.

`workspace_id` is the Space the item is now in. Errors: 400 without `target_folder_id`, 403 for a destination or source the user may not write in, 404 for a folder or Space the user does not belong to, 422 with `errors` when the rules above refuse it (moving into the Space the item is already in, an archived destination folder, the Root folder, a Collection link, or a project that still has allocations). Moving within one Space is still the existing `PATCH` of `folder_id` or `parent_id`; the move endpoint rejects the same Space.

Frontend: `useSpaceFolders`, `useAttachedRecords` (folders only; `FolderApi#attachedRecords`) and `useTransfer` in `frontend/src/api/transfer.ts`; the failed call is shown inside the dialog (the request is `silent` for the global notice). Pure rules and wording are in `frontend/src/data/transfer.ts`, `data/workspace.ts` (`transferTargets`, the role checks, moved here from `api/workspaces.ts`, which re-exports them) and `data/folder.ts` (`folderChoices`).

## Who can view and change
The user needs the `member` role or above in the Space the item leaves or is copied from, and in the destination Space. A viewer can read a Space but cannot copy or move things out of it. This is the cautious choice (it is the same rule as editing); allowing viewers to copy out would be a one-line change in `DocumentsController#set_document` and the folders controller.

## Web entry points
`FolderItem.tsx` (the tree's menus) opens the dialog through `store/transfer.ts`; `TransferHost` in `components/workspace/TransferDialog.tsx` is mounted once in `Sidebar.tsx`, so the dialog survives the moved row leaving the tree. The Mac app shows the same sidebar in its web view, so it has the same menu; there is no native version. After a move the moved item's page is left for `/space` and the tabs of the moved documents are closed (`removeTabs` in `store/tabs.ts`).

## Tests
- `backend/test/services/space_transfer_test.rb`: task id remapping, copying documents with tasks and assignees, Collections (values, links, same-Space copy), folder copy with nested folders and re-pointed links, document and folder move, Collection link and attached-record refusals, rollback.
- `backend/test/services/space_transfer_test.rb` also covers the folder-attached records: every kind detached on a move and left in the old Space, the subtree and document tasks, status settings moving with the folder, allocations refusing the move, the summary counts, a copy leaving them behind, and a rollback after detaching.
- `backend/test/controllers/space_transfer_controller_test.rb` also covers `attached_records` and the allocation refusal.
- `backend/test/controllers/space_transfer_controller_test.rb`: responses, role and membership checks, missing destination, same-Space move, the Space folder list.
- `frontend/src/data/transfer.test.ts`, `data/workspace.test.ts`, `data/folder.test.ts` (`folderChoices`), `components/workspace/TransferDialog.test.tsx`.

## Known limits
- Records filed directly under a folder are detached on a move and left behind on a copy, never moved or copied with it. Moving or copying them along (with the epic, milestone, initiative and sprint links that would then be cut) is the owner's call and is not built.
- A move waits for the attached-record counts: if they cannot be loaded the dialog says so and Move stays disabled (a copy is still allowed).
- A release that lists a moved document keeps the link across Spaces (`docs/backlog/cut-release-links-when-a-document-moves-between-spaces.md`).
- AI runs of a moved task are deleted; dependencies and event links of moved tasks are removed. Copies start without them.
- Copying a very large Collection runs in one request and creates its values one at a time.
- Uploaded images and videos inside a document are referenced by URL, so a copy and its original share the same files.
- Offered only from the sidebar tree, not from the document page, All files, Projects or by drag and drop (`docs/backlog/transfer-from-the-document-page-and-file-lists.md`).
- Tabs of documents inside a moved folder are closed, but other open pages are not refreshed beyond the usual query refetch.
- Copies keep the original title; there is no "(copy)" suffix.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/move-or-copy-content-between-spaces`).
- Not implemented: moving folder-attached tasks, events, epics and milestones; entry points outside the sidebar; keeping AI runs and dependencies across a move.
- Not verified: nothing was run against Rails, a database or a browser (no network, `node_modules` or database here). Ruby syntax and the pure `remap_task_ids` function were checked with `ruby`; the frontend data tests ran with the offline shim; the Minitest and Jest component tests were written but not run; lint and type-check were not run.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Extended 2026-11-03 (not deployed; on branch `backlog/move-folder-attached-records-between-spaces`): a folder with records filed directly under it can now be moved (they are detached) or copied (they are left behind), and the dialog counts them beforehand. The conservative option was built because which links to cut is the owner's call (see Known limits). Not verified: the Minitest tests, `rails test`, `npm run lint`, `tsc -b` and a browser check were not run (no network, `node_modules` or database here). Ruby syntax and the frontend data tests ran offline; the dialog's Jest tests ran with the offline stand-in (12 of 13 passed; the 13th, an existing test, fails only because the stand-in stubs axios and `isAxiosError`).

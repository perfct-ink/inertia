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
```

`workspace_id` is the Space the item is now in. Errors: 400 without `target_folder_id`, 403 for a destination or source the user may not write in, 404 for a folder or Space the user does not belong to, 422 with `errors` when the rules above refuse it (moving into the Space the item is already in, an archived destination folder, the Root folder, a Collection link, or a folder that still has tasks, events, epics or milestones attached to it directly). Moving within one Space is still the existing `PATCH` of `folder_id` or `parent_id`; the move endpoint rejects the same Space.

Frontend: `useSpaceFolders` and `useTransfer` in `frontend/src/api/transfer.ts`; the failed call is shown inside the dialog (the request is `silent` for the global notice). Pure rules and wording are in `frontend/src/data/transfer.ts`, `data/workspace.ts` (`transferTargets`, the role checks, moved here from `api/workspaces.ts`, which re-exports them) and `data/folder.ts` (`folderChoices`).

## Who can view and change
The user needs the `member` role or above in the Space the item leaves or is copied from, and in the destination Space. A viewer can read a Space but cannot copy or move things out of it. This is the cautious choice (it is the same rule as editing); allowing viewers to copy out would be a one-line change in `DocumentsController#set_document` and the folders controller.

## Web entry points
`FolderItem.tsx` (the tree's menus) opens the dialog through `store/transfer.ts`; `TransferHost` in `components/workspace/TransferDialog.tsx` is mounted once in `Sidebar.tsx`, so the dialog survives the moved row leaving the tree. The Mac app shows the same sidebar in its web view, so it has the same menu; there is no native version. After a move the moved item's page is left for `/space` and the tabs of the moved documents are closed (`removeTabs` in `store/tabs.ts`).

## Tests
- `backend/test/services/space_transfer_test.rb`: task id remapping, copying documents with tasks and assignees, Collections (values, links, same-Space copy), folder copy with nested folders and re-pointed links, document and folder move, Collection link and attached-record refusals, rollback.
- `backend/test/controllers/space_transfer_controller_test.rb`: responses, role and membership checks, missing destination, same-Space move, the Space folder list.
- `frontend/src/data/transfer.test.ts`, `data/workspace.test.ts`, `data/folder.test.ts` (`folderChoices`), `components/workspace/TransferDialog.test.tsx`.

## Known limits
- A folder with tasks, events, epics or milestones attached to it directly (not through a document) cannot be moved; it can be copied, but those items are not copied (`docs/backlog/move-folder-attached-records-between-spaces.md`).
- AI runs of a moved task are deleted; dependencies and event links of moved tasks are removed. Copies start without them.
- Calendar entries of dates picked in a document (`document_dates.md`) stay in the old Space when the document or its folder moves: they lose their document and project but stay on the old calendar, and the date chips left in the moved document read "Deleted date". A copy to another Space has the same dangling chips; a copy within the Space shares the original's entries.
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

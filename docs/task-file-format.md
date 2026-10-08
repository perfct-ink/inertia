# Inertia Tasks v3

An `.inertia-tasks` file is a UTF-8 JSON document containing one task collection, its Workboard (Kanban) columns, and zero or more sprints, epics, and milestones. List and Workboard views use the same tasks. The file is the source of truth for a local document; opening it does not import it into the Rails database or require an account.

## Open and save

Build with `make build-native-mac`. Open the file in the native Inertia application, or choose **File → New** to create a new one and **File → Save** (Command-S) to save it. macOS manages document windows, save panels, and autosaving through SwiftUI DocumentGroup. Inertia registers the extension using the exported UTI `com.inertia.tasks`, conforming to `public.json`. `.tasks` is deliberately not registered because unrelated apps already use that extension.

Double-click a file once macOS has registered the app; if another Inertia installation is selected, use Finder's **Open With** and choose `macos/dist/Inertia.app`. The Electron app does not handle this format yet. A sample is in `examples/Launch.inertia-tasks`.

## Fields

All fields below are required except those marked optional. Unknown fields and unsupported versions are rejected on opening to prevent silent data loss. Objects use UUID strings for IDs, independent of backend numeric IDs. IDs must be unique within each collection. Writers should preserve IDs across edits and copies of tasks within the same document must receive new IDs.

| Object | Fields |
| --- | --- |
| Root | `format`: exactly `com.inertia.tasks`; `version`: integer `3`; `id`: UUID; `title`: string; `columns`, `tasks`, `sprints`, `epics`, `milestones`: arrays; optional `users`: array |
| Column | `id`: UUID; `title`: string; `isCompleted`: boolean |
| Task | `id`: UUID; `title`: nonblank string; `description`: plain-text string (may be empty); `columnID`: column UUID; optional `sprintID`, `parentID`, `epicID`, `milestoneID`, `assigneeID`: UUID; optional `dueDate`: date; optional `comments`: array |
| Sprint | `id`: UUID; `title`: string; `goal`: plain-text string; optional `startDate`, `endDate`: dates |

Optional fields may be omitted or null. Dates are real Gregorian calendar dates in `YYYY-MM-DD` form, with no time zone. A sprint's end cannot precede its start. At least one column is required. Column array order determines board order; task array order determines list order and relative card order within each column. Moving a card appends it to the destination column. Sprints appear in array order.

Every task must reference an existing column. Sprint and parent references must exist if set; parent chains cannot contain cycles. A task belongs to at most one sprint. Unassigned tasks can be filtered separately, independently of which column they occupy. Sprint progress is computed from tasks assigned to that sprint whose column has `isCompleted: true`; both parents and subtasks count as individual tasks. Removing a sprint keeps its tasks and clears their sprint assignment. Removing a task keeps its children and clears their parent reference.

## Epics and milestones

| Object | Fields |
| --- | --- |
| Epic | `id`: UUID; `title`: string; `notes`: plain-text string; optional `startDate`, `targetDate`: dates |
| Milestone | `id`: UUID; `title`: string; `notes`: plain-text string; `completed`: boolean; optional `targetDate`: date; optional `epicID`: epic UUID |

Task epic and milestone references must exist when set. Milestones may belong to an epic or stand alone. An epic's target date cannot precede its start date. A task may simultaneously belong to one epic, one sprint, and one milestone; these assignments are independent. Assigning a milestone does not implicitly assign its epic to the task. Array order controls epic and milestone display order.

Epic completion is the number of directly assigned tasks in completed columns divided by all directly assigned tasks. Parent and child tasks count individually if assigned. Marking a milestone **Reached** is explicit, independent of task completion. Removing an epic preserves its tasks and milestones while clearing their epic references. Removing a milestone preserves its tasks while clearing their milestone references.

## Version compatibility

Inertia reads versions 1, 2, and 3 and writes version 3. Version 1 has no `epics` or `milestones` arrays and no task `epicID`/`milestoneID` fields. Versions 1 and 2 use task `notes` rather than `description` and have no users, assignees, or comments. Opening them copies task notes exactly into descriptions, initializes the new collections empty, and preserves existing IDs, dates, relationships, and order. Epics and milestones retain their own `notes` field.

Opening upgrades only the in-memory representation. The next save writes v3. Older Inertia versions cannot read v3 files; use a copy if the file must remain usable with an older app. Unsupported versions and unknown fields are rejected, not silently removed.

## Optional users and task comments

| Object | Fields |
| --- | --- |
| User | `id`: UUID; `name`: nonblank string; optional `email`: string |
| Comment (nested in a task) | `id`: UUID; `body`: nonblank plain-text string; `createdAt`: UTC timestamp; optional `authorID`: user UUID; optional `authorName`: name snapshot |

The root `users` array and each task's `comments` array can be omitted, null, or empty. Inertia writes them as arrays. A task can have one optional assignee; comments may have no author. Referenced users must exist in the same file. User IDs are unique among users, and comment IDs are unique across all tasks in the file. Comments appear in array order. Timestamps use the exact UTC form `YYYY-MM-DDTHH:mm:ssZ`, for example `2026-10-07T12:00:00Z`.

The task editor exposes Title and Description, optional Assignee, and Comments. Users are managed from the toolbar. Add a comment with an optional author, then save the task; canceling the task editor discards draft changes. Existing comment text can be edited or removed. `createdAt` records creation time, not last edit time.

Users are local file metadata, not authenticated accounts, invitations, or access controls. No email is sent. The UI stores an author-name snapshot when creating an attributed comment. Removing a user clears task assignments and comment author IDs, but keeps the comment body, timestamp and author-name snapshot (or fills it from the removed user if absent). This is editable collaboration metadata, not a verified audit trail.

## Portability and limits

The file contains data, not executable code, secrets, or backend credentials. It can be stored in any local or synced directory and read by other tools following this specification. File syncing and simultaneous-edit conflict resolution are separate concerns: this format is not a CRDT or a collaborative sync protocol. There is no automatic linking to the online workspace. A future incompatible schema must increment `version`; the reader does not discard unknown fields.

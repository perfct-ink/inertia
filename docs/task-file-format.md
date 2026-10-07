# Inertia Tasks v2

An `.inertia-tasks` file is a UTF-8 JSON document containing one task collection, its Workboard (Kanban) columns, and zero or more sprints, epics, and milestones. List and Workboard views use the same tasks. The file is the source of truth for a local document; opening it does not import it into the Rails database or require an account.

## Open and save

Build with `make build-native-mac`. Open the file in the native Inertia application, or choose **File → New** to create a new one and **File → Save** (Command-S) to save it. macOS manages document windows, save panels, and autosaving through SwiftUI DocumentGroup. Inertia registers the extension using the exported UTI `com.inertia.tasks`, conforming to `public.json`. `.tasks` is deliberately not registered because unrelated apps already use that extension.

Double-click a file once macOS has registered the app; if another Inertia installation is selected, use Finder's **Open With** and choose `macos/dist/Inertia.app`. The Electron app does not handle this format yet. A sample is in `examples/Launch.inertia-tasks`.

## Fields

All fields below are required except those marked optional. Unknown fields and unsupported versions are rejected on opening to prevent silent data loss. Objects use UUID strings for IDs, independent of backend numeric IDs. IDs must be unique within each collection. Writers should preserve IDs across edits and copies of tasks within the same document must receive new IDs.

| Object | Fields |
| --- | --- |
| Root | `format`: exactly `com.inertia.tasks`; `version`: integer `2`; `id`: UUID; `title`: string; `columns`, `tasks`, `sprints`, `epics`, `milestones`: arrays |
| Column | `id`: UUID; `title`: string; `isCompleted`: boolean |
| Task | `id`: UUID; `title`: string; `notes`: plain-text string; `columnID`: column UUID; optional `sprintID`, `parentID`, `epicID`, `milestoneID`: UUID; optional `dueDate`: date |
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

Inertia reads versions 1 and 2 and writes version 2. Version 1 has no `epics` or `milestones` arrays and no task `epicID`/`milestoneID` fields. Opening a v1 file initializes those arrays empty, preserves existing IDs, tasks, columns and sprints, and upgrades the version in memory. The next save writes v2. Older Inertia versions that only read v1 cannot open the upgraded file; use a copy if it must remain usable with an older app. Unsupported versions and unknown fields are rejected, not silently removed.

## Portability and limits

The file contains data, not executable code, secrets, or backend credentials. It can be stored in any local or synced directory and read by other tools following this specification. File syncing and simultaneous-edit conflict resolution are separate concerns: this format is not a CRDT or a collaborative sync protocol. There is no automatic linking to the online workspace. A future incompatible schema must increment `version`; the reader does not discard unknown fields.

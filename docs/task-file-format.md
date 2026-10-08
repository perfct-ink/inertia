# Inertia Tasks v4

An `.inertia-tasks` file is a UTF-8 JSON document for a local Workboard. It uses the same public **Task, Epic, Event, and User** records as the native Rails API client. Milestones are Events with `event_type: "milestone"`; event-to-task associations use the existing EventTask relationship.

## Open and save

Build with `make build-native-mac`, then use File → New/Open/Save in `macos/dist/Inertia.app`. SwiftUI DocumentGroup provides document windows and autosaving. The app registers `com.inertia.tasks`, conforming to `public.json`. The Electron app does not handle these files. See `examples/Launch.inertia-tasks`.

## Container and entities

Root fields: `format: "com.inertia.tasks"`, `version: 4`, document `id` (UUID), `title`, `board: {columns: [...]}`, `tasks`, `epics`, `events`, `event_tasks`, optional `users`, and optional `extensions`.

Entity IDs are positive JSON integers, at most 9007199254740991, unique within their collection. They are scoped to the file, not identities in a server database. Keep them stable across edits. The containing document retains a UUID.

| Entity | Fields |
| --- | --- |
| Task | Required `id`, `title`, `status`; optional `description`, `due_date`, `position`, `document_id`, `assignee_id`, `epic_id`, `parent_id`, `folder_id`, `workspace_id`, timestamps |
| Epic | Required `id`, `title`; optional `start_date`, `target_date`, `folder_id`, `workspace_id`, timestamps, API summary counts `tasks_count`/`done_tasks_count` |
| Event | Required `id`, `title`, `event_type`, `date`; optional `description`, `start_time`, `end_time`, `folder_id`, `workspace_id`, timestamps |
| EventTask | Required `event_id`, `task_id`; unique pair |
| User | Required `id`, `name`; optional `email`, timestamps |

Timestamps are `created_at` and `updated_at`. Public profile data only: authentication fields are rejected. Optional fields may be omitted or null. Folder/workspace/document references are preserved as metadata; their contents are not bundled, fetched, or synced.

Task statuses match Rails: `backlog`, `todo`, `in_progress`, `in_review`, `done`. Event types are `deadline` and `milestone`. Tasks can link to multiple events, and events to multiple tasks. Embedded API `events[].tasks` responses are normalized into the root task collection and event-task links; conflicting copies are rejected.

## Board and relationships

Each board column has integer `id`, `title`, and `status`. A task's optional `extensions.column_id` selects its column; when absent, a column is selected by status. Moving a card updates both column and task status. Changing a column's status updates its tasks. Task array order determines display order; moves also update `position`.

Task assignees, parents, epics, and event-task links must refer to records in this file. Parent cycles are rejected. Deleting a task cascades to its subtasks, matching Rails. Deleting an epic clears task epic references; deleting an event removes its joins but retains tasks. Completion is calculated from `status == "done"`, counting each parent and child individually.

Dates use valid Gregorian `YYYY-MM-DD` values. Epic target dates and sprint end dates cannot precede their starts. Titles and user names must be nonblank.

## Optional file extensions

The backend currently has no Sprint or Comment entity. These requested features remain explicitly separated from core records:

- Root `extensions.sprints`: records with integer `id`, `title`, `goal`, optional `start_date`/`end_date`.
- Task `extensions`: optional `column_id`, `sprint_id`, `comments`.
- Comments: integer `id`, nonblank `body`, UTC `created_at` (`YYYY-MM-DDTHH:mm:ssZ`), optional `author_id` and `author_name` snapshot. IDs are unique across all task comments.
- Epic `extensions.notes`: preserves file-only notes.
- Event `extensions.epic_id`, `completed`: preserves legacy epic association and Reached metadata. These are not Rails Event attributes.
- Event `extensions.unscheduled: true`: preserves undated legacy milestones as local drafts. A date is needed before any future server import.

Deleting a sprint keeps tasks and clears their sprint assignment. Deleting a user clears assignments and comment author references while retaining text, timestamps, and author-name snapshots. Users are editable file metadata, not authentication or access control.

## Compatibility and limits

Inertia reads versions 1–4 and writes version 4. Versions 1–3 are migrated in memory: UUID entity IDs become integers with relationships remapped together, notes become descriptions, and milestones become events plus event-task joins. Custom column titles, ordering, sprint data, comments, and attribution are retained. The next save writes v4; older applications cannot read it, so keep a copy when needed.

Unknown fields, invalid relationships, and unsupported versions are rejected rather than silently discarded. Files do not automatically import into or synchronize with Rails. Shared models do not imply shared identities. Concurrent file conflict resolution remains the responsibility of the syncing system; this is not a CRDT format.

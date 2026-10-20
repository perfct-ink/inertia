---
branch: backlog/file-previews-and-gallery
priority: p1
depends_on: []
components: [frontend]
---
# Files gallery of all attachments

## Objective

Files gallery of all attachments

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Files gallery of all attachments works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on `backlog/file-previews-and-gallery` (this branch covers both this task and `files-gallery-of-all-attachments`, as the gallery of the Space's uploaded files), stacked on `backlog/file-download-rename-move-replace` (merge that and its base first). Attachments to tasks and collection fields are not in the gallery (those features do not exist yet). To verify: `cd frontend && npm install && npm run lint && npm test`, then open All files > Gallery in a browser with uploaded images. Then remove this file and merge.

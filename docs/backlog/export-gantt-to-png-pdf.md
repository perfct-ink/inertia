---
branch: backlog/export-gantt-to-png-pdf
priority: p0
depends_on: []
---
# Export Gantt to PNG / PDF

## Objective

Export Gantt to PNG / PDF

## Current state

Nothing exists yet.

## Context

Section "Gantt chart" of the retired shared backlog.

## Acceptance criteria

- Export Gantt to PNG / PDF works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch without new libraries (canvas for PNG, the browser's print dialog for PDF). The layout/painting tests pass in a stand-in runner; the download and print were never run. To verify: `cd frontend && npm install && npm run lint && npm test`, then export a folder's Gantt in a browser (light and dark) and print it to PDF. Arrows and milestones are not in the image. Then remove this file and merge.

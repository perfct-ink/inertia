---
branch: backlog/task-line-two-way-sync
priority: p0
depends_on: []
components: [frontend, backend]
---
# Keep a document task line and its task in sync

## Objective
A task line in a document and the Space task behind it stay the same item: edits on either side update both. Today the line only reads status and due date.

## Context
A checklist line creates a task on save (`syncTaskNodes` in `view/document/DocumentScreen.tsx`) and stores `taskId` on the line. After that, renaming the task elsewhere does not update the line, editing the line does not rename the task, deleting either side does not touch the other, and the line has no checkbox tied to task status. Rule from the old backlog (`docs/features/document_task_lines.md` and `task-line-two-way-sync.md`): the task is the source of truth; the line is a live reference to it. Deleting the line asks whether to delete or keep the task.

## Requirements
- Render the line text from the task title and save line edits back to the task title.
- Add a checkbox on the line: checked means status `done`, and changing status elsewhere updates the checkbox.
- When a task is deleted, mark or remove its line.
- When a line is deleted, ask whether to delete or keep the task.

## Acceptance criteria
- Renaming a task on the tasks page changes the title shown in its document line.
- Editing the line text changes the task title.
- Checking the line sets the task to done; setting the task to done checks the line.
- Deleting a task removes or flags its line; deleting a line shows a prompt offering to delete or keep the task.
- Failed updates show an error.

## Blocked
Implemented on the branch, stacked on `backlog/task-line-set-assignee-status-start-date` (merge it first). The reconcile rules are unit-tested and pass in a stand-in runner, but the editor wiring (`reconcileTaskLines`) is the riskiest part and was never run: test in a browser typing in a line while the task refreshes, renaming the task elsewhere, ticking the checkbox, deleting a line (the prompt) and a task, and with two people in the document. To verify the rest: `cd frontend && npm install && npm run lint && npm test`. Then remove this file and merge.

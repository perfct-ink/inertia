# Cards view

## What it does
A **Cards** tab on a folder page (`/folders/:id?view=cards`) shows the folder's tasks as a gallery of cards: status, title, epic, due date (red "Overdue" when past due and not done) and a progress bar of the task's subtasks at any depth. Subtasks appear only inside their parent's progress, not as separate cards. A card opens the document its task lives in. With no tasks it says so.

## API and models
No new endpoints; it uses the folder contents (`useFolderContents`: tasks and epics). `taskCards` in `frontend/src/data/task.ts` builds the cards.

## Who can view and change
Anyone who can open the folder. The view is read-only.

## Tests
`frontend/src/data/task.test.ts` (`taskCards`), `frontend/src/view/folder_detail/CardsView.test.tsx`.

## Known limits
Cards are tasks only; documents, sheets and Collections are not shown as cards (they are chips above the view). No grouping, filtering, drag or inline edit. Card colours come from the theme tokens only; no cover images.

## History
- Implemented 2026-10-19 on branch `backlog/cards-gallery-view`; not merged or deployed.
- Not verified: Jest, lint, type-check, the browser. A static import/syntax/SCSS check and the pure `taskCards` test ran.

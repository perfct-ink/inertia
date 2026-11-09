# Notifications inbox

## What it does
Each person has an inbox. `/inbox` (the bell at the bottom of the icon rail, beside Quick add, with an unread count badge, refreshed every minute) lists their notifications newest first across all their Spaces. Clicking one marks it read and opens what it is about (a task opens the Workboard; a document opens the document). "Mark all read" clears the badge. Sources: **task assignment** (assigning a task to someone notifies them, "You were assigned “…”", except when they assign it to themselves) and **@mentions in comments** ("<name> mentioned you on “…”", opening the Workboard, Epics, Initiatives or Milestones page; see [comments.md](comments.md)).

## API and models
`notifications` (`user_id`, `workspace_id`, `kind`, `title`, `body`, polymorphic `subject`, `read_at`). `Notification.notify(recipient:, workspace:, kind:, title:, subject:, actor:)` is the one way to add items and skips the actor and a nil recipient; other features call it. `GET /api/v1/notifications` (latest 50 plus `unread_count`), `PATCH /api/v1/notifications/:id` (mark read), `POST /api/v1/notifications/read_all`. Always the signed-in user's own; other people's are 404. `Task#actor` (set by the controller) carries who made the change. Frontend: `api/notifications.ts`, `data/notification.ts`, `view/inbox/InboxScreen.tsx`, the badge in `file-manager/Sidebar.tsx`.

## Who can view and change
Only the recipient reads or marks their own notifications.

## Tests
`backend/test/models/notification_test.rb`, `backend/test/controllers/notifications_controller_test.rb`, `frontend/src/data/notification.test.ts`, `frontend/src/view/inbox/InboxScreen.test.tsx`.

## Known limits
- Only the first assignee (`assignee_id`) is notified; people added through `assignee_ids` after the first are not.
- Only task assignment and comment mentions create notifications. Check-ins, AI worker questions and other comments are separate backlog items that will call `Notification.notify`.
- No email or push, no per-kind settings, no deleting or paging beyond the latest 50, and updates arrive by polling (up to a minute late).
- Opening a task notification goes to the Workboard, and a planning-item one to that item's list page, not to the item or its comments.
- The Space a notification came from is not shown or switched to; `workspace_id` is stored for when it is.

## History
- Implemented 2026-10-19 on branch `backlog/notifications-inbox`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

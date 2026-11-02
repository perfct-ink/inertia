# Comments on items

## What it does
Members of a Space can comment on tasks, epics, initiatives and milestones. The product calls them "Comments" in the UI (the backlog also called them "Updates").

- **Open a conversation**: every task (backlog row and Kanban card on `/tasks`), epic and initiative card (`/epics`, `/initiatives`) and milestone card (`/milestones`) has a speech-bubble button ("Comments on <title>"). It opens a dialog with the item's conversation (`components/comments/CommentsButton.tsx`). The button does not open the card behind it.
- **Comments and replies**: comments are listed oldest first with a box to add one at the bottom. "Reply" under a comment opens a reply box; replies are one level deep, so answering a reply joins the same thread (the server flattens it too). The list scrolls inside the dialog and jumps to the newest comment.
- **@mentions**: typing `@` in a box suggests the Space's members (not yourself; matched on any word of the name, or the start of the email). Arrow keys plus Enter or Tab, or a tap or click, writes `@Full Name ` into the text. A mention is recorded only for a member whose `@Name` is still in the saved text, so deleting the name drops the mention. Mentioned names are highlighted in the comment. Two members with the same name are told apart by which one was picked. No notification is sent yet (see Known limits).
- **Edit and delete**: the author can edit their comment (it then shows "(edited)"). The author, or a Space admin or owner, can delete a comment; a confirmation dialog says its replies go with it.
- **Keyboard**: `Ctrl/Cmd+Enter` posts from the text box. The box keeps your text if posting fails.
- **Viewers** can read comments but see no box or edit/delete buttons (a note says so).
- **Failed calls**: every API error shows the usual error notice (`lib/api.ts`); a failed load also shows "Comments could not be loaded." in the dialog.
- **Mobile and dark mode**: the dialog fits a 375px screen (it is `calc(100vw - 2rem)` wide and scrolls inside its list); buttons and suggestions are at least 40px tall on touch screens; colors come from the theme variables so dark mode follows the app.

## API and models
- `comments` table: `workspace_id`, polymorphic `commentable_type`/`commentable_id`, `author_id` (nullable; the foreign key nullifies when a user is deleted so replies survive, shown as "Deleted user"), `parent_id` (self reference, set on replies), `body` (text), `edited_at`, timestamps. `comment_mentions`: `comment_id`, `user_id`, unique per pair. Migration `20261101210001_create_comments_and_mentions.rb`.
- `Comment` (`COMMENTABLES` lists the allowed types and the Workspace association that scopes each: Task, Epic, Initiative, Milestone). It validates a non-blank body of at most 5,000 characters (stripped), an allowed type, an item in the same Space, an author who is a member of the Space (on create), and a parent that is a comment on the same item. `edited_at` is set when the body changes. `save_with_mentions(user_ids)` saves the comment and its mentions in one transaction, keeping only Space members still named in the body. Models with comments include the `Commentable` concern (`has_many :comments, as: :commentable, dependent: :destroy`); `Workspace` and `User` clean up comments and mentions.
- `GET /api/v1/comments?commentable_type=Task&commentable_id=1` returns the whole conversation flat, oldest first, with `parent_id` (the client nests it in `buildThreads`). `POST /api/v1/comments` takes `comment[commentable_type, commentable_id, body, parent_id, mentioned_user_ids[]]` and returns 201. `PATCH /api/v1/comments/:id` takes `comment[body, mentioned_user_ids[]]`; leaving the ids out keeps the existing mentions the text still names. `DELETE /api/v1/comments/:id` returns 204 and removes replies. An unknown type, or an item (or comment) in another Space, is 404; validation errors are 422 with `errors`.
- `CommentBlueprint` returns `id, commentable_type, commentable_id, parent_id, body, author_id, author{id,name}, mentioned_users[{id,name}], edited_at, created_at`. User-facing names are in `backend/config/locales/en.yml`.
- Frontend: `api/comments.ts` (`CommentApi`, an `ApiResource` from `api/base.ts`, and the hooks), `data/comment.ts` (threads, mention matching and suggestions, permissions, time labels), `components/comments/` (`Comments`, `CommentItem`, `CommentComposer`, `CommentsButton`, `Comments.scss`). The dialog is the shared `Modal` with a `comments-dialog` class for its wider, scrolling box.

## Who can view and change
Scoped to the current Space (`X-Workspace-Id`) through `WorkspaceScoped`: any member, viewers included, can read; posting, editing and deleting need the member role or above. Only the author edits; the author or an admin/owner deletes.

## Web entry points
`/tasks` (backlog rows and Kanban cards), `/epics`, `/initiatives`, `/milestones`.

## Tests
- `backend/test/models/comment_test.rb`, `backend/test/controllers/comments_controller_test.rb`
- `frontend/src/data/comment.test.ts` (threads, mentions, suggestions, permissions, time labels)
- `frontend/src/components/comments/Comments.test.tsx`, `CommentsButton.test.tsx`; `view/milestones/MilestonesScreen.test.tsx` (the button on each card)

## Known limits
- Mentions are stored but nobody is notified; a notifications inbox is a separate backlog item (`docs/backlog/notifications-inbox.md`) and can read `comment_mentions`.
- No comment counts on rows and cards, no live updates (a conversation is fetched when its dialog opens), no rich text, attachments or reactions.
- Replies are one level deep. Esc closes the whole dialog even while the mention suggestions are open.
- Only the four planning item types have comments. Documents are a separate backlog item (`comments-on-documents.md`); add a type to `Comment::COMMENTABLES` and include `Commentable` to reuse this table.
- Viewers cannot comment at all. An admin can delete but not edit other people's comments. The hierarchy, roadmap, Gantt and OKR screens have no comment button yet.

## History
- Implemented 2026-11-01 (not deployed; on branch backlog/comments-on-items).
- Not implemented: notifications for mentions, comment counts, live updates, comments on documents and key results.
- Not verified: the backend tests, `rails db:migrate` and `schema.rb` (hand edited), `npm run lint` and the browser (no database, node_modules or network). Run offline: the pure data tests and the component tests through a stand-in Jest, and `ruby -c` on the Ruby files.

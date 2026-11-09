# Forms that create tasks

## What it does
`/forms` (sidebar rail "Forms") lists the Space's forms. A form asks a few questions and turns each filled-in copy into a task in the Space. It is separate from project intake (see [project_intake.md](project_intake.md)): that asks for a project and needs approval, a form here makes a plain task straight away.

- **Build** (members, admins, owners): "New form" asks for a title and opens the builder at `/forms/:id/edit`. A new form starts with a required Title question and an optional Details question. The builder has three parts.
  - Settings: title, description (shown above the questions) and "Accepting responses" (turn off to close the form).
  - Where the tasks go: the status the tasks start in (default Backlog), an epic, a folder or project, and an assignee (a Space member). All optional.
  - Questions (up to 20): label, type (short text, long text, date, choice), which part of the task the answer fills in, required, and for a choice the options, one per line (at least two). Questions can be moved up and down and removed. One question must fill in the task title (it is always required and cannot be removed while it does).
- **What an answer fills in**: the task title (short text), description (short or long text), start date or due date (date), or "extra detail". Each of title, description, start date and due date can be asked for once. Extra details (any type) are written into the task description as `Label: answer` lines after the description answer.
- **Fill in** (members, admins, owners): "Fill in" on the list, or on the builder, opens `/forms/:id`. Required questions left blank are reported before anything is sent. The server checks dates, choices and lengths. On success the page names the task and links to Tasks.
- **Responses**: the builder lists the latest 50 responses with the task title, who sent it (or "Public link"), the date, the task's status and every answer as it was worded when it was sent (editing the form later does not rewrite old answers).
- **Public link** (optional, off): see below.

### Public link (conservative version, needs Alex's decision)
Tasks can also be created by someone with no account, through `/f/<token>` (the app uses hash routes, so the address is `.../#/f/<token>`). Because this lets anyone on the internet create tasks in a Space, it is off in three ways:
1. The server refuses to turn it on unless the deployment sets `PUBLIC_FORMS_ENABLED=true` (see `docs/services.md`). Unset, the builder's checkbox is disabled and every public address answers 404.
2. Each form has to be switched on by an admin or owner of the Space (any member can switch it off). It is off by default.
3. The address holds a random token (192 bits). Switching public access off and on again gives a new token, so a leaked link can be retired.

Limits on abuse: a form that is closed, private, or whose token is wrong answers 404 to everyone, so a dead link doesn't say why. Each form accepts at most 30 public responses per hour (then 429 "try again later"). A hidden "website" field catches simple bots (they get a "thanks" and no task). Answer lengths are capped (255 characters for short text, 5,000 for long text). The public page shows only the questions, never the epic, folder, assignee or Space. Answers are filtered out of the request log. There is no per-IP rate limit (no rate-limiting gem is installed), no CAPTCHA, and no email or contact field, so a public response is anonymous.

## API and models
- `task_forms` table (model `TaskForm`, shown as "Form"): `workspace_id`, `title` (required), `description`, `questions` (JSON list), `token` (unique), `enabled`, `public_access`, `default_status` (a task status, default `backlog`), `epic_id`, `folder_id`, `assignee_id`, `created_by_id`. The epic, folder, assignee and creator fall back to none if deleted. The epic and folder must be in the same Space, the assignee a Space member.
- `task_form_submissions` table (`TaskFormSubmission`, "Response"): `task_form_id`, `task_id` (deleting the task deletes the response), `submitted_by_id` (null for a public response), `answers` (JSON list of `label`/`value`).
- `TaskFormSchema` (plain Ruby, `app/models/task_form_schema.rb`) holds the rules: question shape, which kinds can fill in which part of the task, and turning answers into task attributes. `TaskForm#submit` builds the task and the response in one transaction and returns an outcome with the errors, if any. A closed form returns "This form is closed".
- `GET/POST /api/v1/task_forms`, `PATCH/DELETE /api/v1/task_forms/:id` (list includes `submissions_count`; `token` is only sent while the form is public).
- `GET/POST /api/v1/task_forms/:id/submissions`: list the latest 50, or fill in as a signed-in member (body `{ answers: { <question id>: "text" } }`; 422 with `errors` on a problem).
- `GET /api/v1/public_forms/:token` and `POST /api/v1/public_forms/:token/submissions` (no sign-in; body `{ answers, website }`; answers `{ submitted: true }`).
- Frontend: `api/taskForms.ts` (a `TaskFormApi` class on the API base, plus `PublicTaskFormApi`), types in `types/taskForm.ts`, pure rules in `data/taskForm.ts`.

## Who can view and change
- Scoped to the Space named by `X-Workspace-Id`; a form of another Space is 404.
- View the list and responses: any member, including viewers.
- Create, edit, delete, fill in: members, admins, owners (viewers get 403, like every other write).
- Turn the public link on: admins and owners (403 for a member). Turn it off, or save other changes while it is on: any member.
- The public endpoints need nothing but the token, and only while the server flag, `public_access` and `enabled` are all on.

## Web entry points
- `view/forms/FormsScreen.tsx` (`/forms`), `view/form_builder/FormBuilderScreen.tsx` with `QuestionEditor.tsx` (`/forms/:id/edit`), `view/form_fill/FormFillScreen.tsx` (`/forms/:id`), `view/public_form/PublicFormScreen.tsx` (`/f/:token`, outside the sign-in guard). The shared question controls are `components/forms/TaskFormFiller.tsx`. Routes in `App.tsx`, rail button in `components/file-manager/Sidebar.tsx`.
- Failed calls show the shared error notice; the fill-in and builder pages also show the reason next to the form. The public page handles its own errors (a missing link is a page, not a notice).

## Tests
- `backend/test/models/task_form_schema_test.rb` (pure; ran offline with a stub helper, passes), `backend/test/models/task_form_test.rb`
- `backend/test/controllers/task_forms_controller_test.rb`, `backend/test/controllers/public_forms_controller_test.rb`
- `frontend/src/data/taskForm.test.ts` (ran offline, passes), `components/forms/TaskFormFiller.test.tsx`, `view/forms/FormsScreen.test.tsx`, `view/form_builder/FormBuilderScreen.test.tsx`, `view/form_fill/FormFillScreen.test.tsx`, `view/public_form/PublicFormScreen.test.tsx` (these five ran offline through the Jest stand-in, pass)

## Known limits
- A form creates top-level tasks only: no sprint, milestone, parent task, priority or custom field answers, and no document is created.
- A response is not linked from the task (the task page has no "came from form X"), and the response list shows the latest 50 only.
- No notification or email when a form is filled in; no confirmation text or redirect can be set for the "thanks" step.
- Question types are fixed (no number, email, file upload, multi-select or conditional questions). The Space's custom task fields are not offered as answers.
- Task statuses are shown with their default names in the builder, not a Space's renamed ones.
- The public page has no CAPTCHA or per-IP limit, and collects no contact details; see above.
- Editing a form's questions does not change tasks already made. Removing a question keeps its old answers in past responses.

## History
- Implemented 2026-11-02 (not deployed; on branch `backlog/forms-that-create-tasks`).
- Decision for Alex: public submission is built but off (server flag, admin switch, token, hourly cap). Leave `PUBLIC_FORMS_ENABLED` unset to keep forms internal.
- Not implemented: per-IP limits or CAPTCHA, contact fields, sprint/priority/custom-field targets, notifications, linking a task back to its form.
- Not verified: the migration (`schema.rb` was edited by hand and merged with main's), Rails tests, `npm run lint`, `tsc`, the real Jest run, and the pages in a browser at 375px and desktop, light and dark (no database, node_modules or network here).

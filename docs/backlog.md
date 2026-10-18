# Backlog: Monday.com feature parity

Date: 2026-10-11  
Status: backlog, not a commitment or a sequence of sprints. Nothing below is built unless the "Today" note says so.

Goal: cover everything Monday.com Work Management offers, with Gantt charts, Initiatives, product roadmaps and a task hierarchy as the headline items, all rolling up under a Milestone.

Related: `docs/project-management-features.md` (gap analysis vs. Jira) already covers Initiatives, Timeline/Gantt, Sprints, dependencies and reporting. This backlog reuses that analysis and widens it to Monday's full surface. Where the two overlap, the item here points back to it rather than repeating the reasoning.

## How to read this

- **Terminology**: workspaces are called Spaces in the product (all UI, copy and docs). Code, API paths, X-Workspace-Id and DB keep 'workspace'. See `docs/spaces.md`.
- IDs are stable (`PM-03`); reference them in PRs and commits.
- **Priority**: P0 = the headline ask (milestone, hierarchy, Gantt, roadmap), P1 = needed for the headline items to be useful day to day, P2 = Monday parity beyond that, P3 = large or speculative.
- **Today** says what already exists in this repo, checked against `backend/db/schema.rb` and the models on 2026-10-11.
- Monday feature names come from Monday's own support docs and a 2026 feature breakdown (sources at the bottom). Plan tiers (which Monday plan ships what) are not tracked here.

## 1. Planning hierarchy (P0)

The model Alex asked for: a hierarchy of work, with every level able to sit under a Milestone.

```
Milestone                 (target date, rollup of everything under it)
└── Initiative            (strategic theme, spans multiple epics)
    └── Epic              (exists today)
        └── Task          (exists today)
            └── Subtask   (exists today, any depth via tasks.parent_id)

Roadmap = a view over Initiatives + Epics, grouped by Milestone and laid out on a time axis.
```

Default chosen for this backlog: Milestone is the top-level container, and each lower level carries an optional `milestone_id`. A task with no milestone of its own inherits its epic's, an epic inherits its initiative's. That lets a single loose task belong to a milestone without forcing an initiative and epic around it, which matches how Monday lets any item link to a milestone via Connect Boards.

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-01 | **Milestone as a first-class model** (built 2026-10-15) | Done: `milestones` table (title, description, target date, status, owner, folder), `Milestone` model, `/api/v1/milestones`, Milestones page. Flat, no nesting. Not done: existing `events.event_type = milestone` rows are **not** migrated (events keep working for the calendar); "Space" has no equivalent here. |
| PM-02 | **Milestone rollup** (built 2026-10-15) | Done: `MilestoneRollup` computes task/done/epic/initiative counts and percent in four queries; `Milestone#health` returns on track / at risk / off track (overdue = off track; due within 14 days and under 75% = at risk). Shown on the Milestones page. |
| PM-03 | **Initiative model and initiative list** (mostly built) | Done: description, status (planned/active/done), owner and `milestone_id` on the API and model; milestone selector on the Initiatives page. Remaining: UI for description, status and owner. |
| PM-04 | `epics.initiative_id`, `epics.milestone_id`, `tasks.milestone_id` (built 2026-10-15) | Done: all three columns, inheritance (task → epic → initiative) in `MilestoneRollup`, same-workspace validation, API params. Task quick-add has a milestone selector (epics and initiatives have one on their pages). Remaining: editing a task's milestone after creation (no task detail view yet). |
| PM-05 | **Hierarchy tree view**: Milestone → Initiative → Epic → Task → Subtask, expand/collapse, inline progress bars at each level (built 2026-10-16) | Done: `/hierarchy` page; `data/hierarchy.ts` normalizes all four levels into one tree (structural parent first — `epic_id`/`parent_id` — falling back to the item's own `milestone_id`, same inheritance `MilestoneRollup` uses server-side; anything with neither lands in an "Unassigned" section instead of being dropped); expand/collapse per node; a progress bar at every level (task-level rollup computed client-side from the subtask tree, since only Milestone/Initiative/Epic get one from the API). | Read-only — no drag-and-drop reparenting across levels (that's PM-06). |
| PM-06 | Move/reparent anywhere in the tree by drag-and-drop | Task reparenting validated in `Task#parent_is_not_self_or_a_descendant` | Extend the same cycle check to epic↔initiative↔milestone moves. |
| PM-07 | Local `.inertia-tasks` file format gains Initiative + Milestone levels | File format has Epics, Sprints, Milestones (via Events) | Open question carried over from `project-management-features.md`. Default: hosted first, file format follows. |

## 2. Gantt chart (P0)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-10 | **Gantt view** for tasks, epics, initiatives: bars from start to end date, grouped by hierarchy, milestone diamonds on the axis | **Partly built** (2026-10-16): the per-folder Gantt tab now also plots that folder's tasks (`start_date`→`due_date`) alongside its epics, combined on one shared `components/Timeline.tsx` axis. Milestones with a target date in that folder now show as diamonds on a marker row above the bars. Dated tasks are now nested under their epic (indented; `groupGanttRows`). Still missing: initiative/milestone grouping above epics, and this hasn't reached the global Epics/Initiatives Timeline pages, only the folder Gantt tab. | Needs PM-11 first for task bars — done. |
| PM-11 | `tasks.start_date` (keep `due_date` as end) (built 2026-10-16) | Done: `tasks.start_date` column, `due_date`-not-before-`start_date` validation (same pattern as Epic/Sprint), permitted on the API, shown as a Start→Due pair in the task quick-add row (`AddTaskInput`). | Still write-only like `due_date` already was — no task detail view exists yet to edit dates after creation (pre-existing gap, not new). |
| PM-12 | Drag a bar to reschedule, drag an edge to resize | n/a | |
| PM-13 | **Dependencies**: finish-to-start, start-to-start, finish-to-finish, start-to-finish, drawn as arrows (built 2026-10-17) | Done: `task_dependencies` table and `TaskDependency` model (same-space, no self links, no duplicates, no loops), `/api/v1/task_dependencies`, arrows on the shared `Timeline` (`links` prop), and a Dependencies editor under the folder Gantt (`view/folder_detail/GanttPane.tsx`). Links are removed with either task. Not done: drawing a link by dragging between bars. | New `task_dependencies` join table. Also Jira-doc sequence step 5. |
| PM-14 | Dependency scheduling modes: strict (block invalid dates), flexible (auto-shift successors), none | n/a | Monday offers these three modes per board. |
| PM-15 | **Critical path** highlight (built 2026-10-17) | Done: `drivingPath` in `data/dependency.ts` walks back from the task that finishes last through whichever predecessor's linked date is latest; those bars get a red outline, toggled by "Highlight critical path". Uses dates as entered (no re-scheduling), so it shows what drives the finish today. | Slack/float per task would need PM-14's scheduling. |
| PM-16 | **Baselines**: snapshot planned dates, show planned vs. actual bars | n/a | |
| PM-17 | Zoom: days / weeks / months / quarters / years; "today" line; weekends shaded or skipped | **Partly built**: a "today" line on the shared `Timeline` (when today is in range). | Zoom levels and weekend shading remain. |
| PM-18 | Export Gantt to PNG / PDF | n/a | |
| PM-19 | Native macOS online Gantt | Named a future stage in `macos/README.md` | Same API as web. |

## 3. Product roadmap (P0)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-20 | **Roadmap view**: initiatives and epics as swimlanes on a quarter/month axis, grouped by milestone (built 2026-10-17) | Done: `/roadmap` Timeline tab (`view/roadmap/RoadmapScreen.tsx`, `data/roadmap.ts`): one lane per milestone in target-date order, then "No milestone"; each initiative followed by its epics; one shared month axis (`Timeline` `range` prop) so lanes line up; the lane's milestone diamond, health and percent in its header. Not done: quarter zoom (see PM-17). | Monday: Roadmap template + Timeline view + Portfolio. |
| PM-21 | Now / Next / Later board mode (no dates required) (built 2026-10-17) | Done: `/roadmap?view=board`. `initiatives.horizon` / `epics.horizon` (nullable enum) hold a hand placement; unplaced items sit by status and dates (active or started = Now, starting within 90 days = Next, else Later). Drag a card, or use its column picker (keyboard path), "Automatic" clears the placement. Finished work and epics under an initiative are left off; the initiative card counts its epics. | Useful before dates are known. |
| PM-22 | Roadmap status and health per initiative, rolled up from epics (built 2026-10-17) | Done: `Initiative#health` (same rule as milestones, now shared in the `PlanningHealth` concern) served on `/api/v1/initiatives`; shown as a badge on board cards and as yellow/red bars on the roadmap timeline. Shared `HealthBadge` UI component replaces the milestone page's own pill. | |
| PM-23 | Shareable read-only roadmap link (external stakeholders) | `shares` table exists for documents | Reuse the share mechanism. |
| PM-24 | Idea / feature-request intake that can be promoted to an epic or initiative | Not present | Monday: WorkForms + intake boards with approval. |

## 4. Portfolio, goals, resources (P1; OKRs and IO Map are P0)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-30 | **Portfolio view**: every project (folder) with owner, status, health, dates, progress in one table | Folders exist, no portfolio rollup | Monday Portfolio (Enterprise). |
| PM-31 | **Goals / OKRs** linked to initiatives, with key-result progress from linked work. **P0**: Alex re-requested 2026-10-13 (built 2026-10-17) | Done: `objectives` and `key_results` tables, `/api/v1/objectives` (key results nested) and `/api/v1/key_results`, `/okrs` page. An objective has a period (start → target date), status, owner, health (milestone rule) and a 0–1 score = average of its key results. A key result is either a number (start → target, current updated inline; targets below the start work, e.g. churn) or linked to an initiative, taking that initiative's task percent. Not done: owner picker in the UI, key-result check-in history, linking objectives to the IO Map (PM-36). | Objectives with 2–5 measurable key results, a quarter or date range, owner, and a score (0–1 or %). Key results either track a number by hand or roll up from linked initiatives/epics/tasks. |
| PM-36 | **Intermediate Objectives Map** (IO Map). **P0**: Alex requested 2026-10-13 | Not present | A visual goal tree from Goldratt's Thinking Process: one Goal at the top, 3–5 Critical Success Factors under it, Necessary Conditions under those. Drawn as a node-and-arrow map. Each node can link to OKRs (PM-31) and initiatives (PM-03), and shows their progress, so the map is the "why" above the roadmap. |
| PM-32 | **Workload view**: assigned effort per person per week, over-allocation warnings | `assignee_id` exists, no effort field | Needs PM-41 (effort). |
| PM-33 | Resource management: capacity per person, allocation to projects | Not present | Jira doc argued against early; still P1 here because Monday has it. |
| PM-34 | Cross-project dependencies | Not present | Builds on PM-13. |
| PM-35 | Project intake form with approval workflow | Not present | |

## 5. Item fields (Monday "column types") (P1)

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

| ID | Item | Notes |
| --- | --- | --- |
| PM-40 | **Custom fields on tasks**, reusing the `table_fields` type system | Pushback in the Jira doc still applies; Monday parity requires it. |
| PM-41 | Priority, effort/estimate, story points (estimated/actual) | |
| PM-42 | Multiple assignees (People) and watchers | Today: single `assignee_id`. |
| PM-43 | Timeline field (start + end) | Same as PM-11. |
| PM-44 | Tags, label/dropdown, checkbox, rating, vote | |
| PM-45 | Numbers with unit + column summary (sum, avg, min, max) | |
| PM-46 | Formula field | |
| PM-47 | Connect / Mirror: link items across boards and show a field from the linked item | `relation` data type exists for tables. |
| PM-48 | Files, link, email, phone, location, country, world clock | |
| PM-49 | Progress (auto from subtasks), time tracking (start/stop timer, logged hours) | |
| PM-50 | Auto fields: item ID, creation log, last updated, created by | |
| PM-51 | Button field (runs an automation) | Needs PM-70. |
| PM-52 | Configurable statuses (custom labels/colors per board) | Today: fixed 5-value enum. Jira doc pushed back; still listed for parity. |

## 6. Views (P1)

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

| ID | Item | Today |
| --- | --- | --- |
| PM-60 | Table view with inline editing, grouping, column show/hide, sort, filter | Task list exists; check grouping/filter coverage |
| PM-61 | Kanban: group by any field, swimlanes, WIP limits, configurable columns. Alex re-requested 2026-10-13, and asked specifically for **organize by epic** (swimlane per epic, plus a "No epic" lane), as an option you can toggle on or off | Kanban exists on the fixed status enum (`/tasks?view=kanban`); the rest is missing |
| PM-62 | Calendar view of tasks (not only events) | Events have list/month views |
| PM-63 | Timeline view (simpler than Gantt: bars, no dependencies) | None |
| PM-64 | Cards / gallery view | None |
| PM-65 | Files gallery of all attachments | None |
| PM-66 | Map view (location field) | None |
| PM-67 | Pivot view | None |
| PM-68 | Saved views per user and shared views, saved filters | None |
| PM-69 | "My Work": everything assigned to me across the Space, by date | None |
| PM-59 | **Epic and feature planning view** (Alex, 2026-10-13): plan tasks by epic or by feature. Pick an epic or a feature (section 12), see its tasks grouped by status, drag tasks from the backlog into it, set dates/estimates, and see its rollup | Today tasks can be assigned an epic (`tasks.epic_id`) and `EpicsPage.tsx` lists epics with progress, but there's no planning screen. Feature planning needs PM-121/PM-123. |

## 7. Automations (P2)

| ID | Item | Notes |
| --- | --- | --- |
| PM-70 | Rule builder: trigger → condition → action | Monday's core differentiator. |
| PM-71 | Triggers: status change, field change, item created, date arrives, subtask done, moved | |
| PM-72 | Actions: notify, assign, change status, move, create item, set date, create subtask | |
| PM-73 | Recipe templates (e.g. "when all subtasks done, mark parent done"; "when epic done, update milestone health") | Rollup recipes tie into PM-02. |
| PM-74 | Recurring tasks | | Moved to PM-226. |
| PM-75 | Automation run log and per-Space limits | |

## 8. Dashboards and reporting (P2)

| ID | Item | Notes |
| --- | --- | --- |
| PM-80 | Dashboards across folders/boards | |
| PM-81 | Widgets: chart, number, battery (progress), Gantt, workload, calendar, table, countdown to milestone | |
| PM-82 | Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned | Needs Sprints + status history. |
| PM-83 | Status-change history (audit trail per item) | Prerequisite for PM-82. |
| PM-84 | Export to CSV / Excel; import from CSV / Excel | |

## 9. Agile (P2)

| ID | Item | Notes |
| --- | --- | --- |
| PM-90 | **Sprints as a Rails model** (built 2026-10-15) | Done: `sprints` table (title, goal, owner, status, start/end date), `Sprint` model (`PlanningItem`, deliberately not `BelongsToMilestone` — a sprint spans epics/initiatives rather than rolling up through them), `/api/v1/sprints`, Sprints page (list only, no board yet). `tasks.sprint_id` plus a Sprint filter and assignment on `TasksScreen`. Remaining: an active-sprint board view (today's kanban is status-only, not scoped to one sprint) and PM-91 (start/close/carry over). |
| PM-91 | Sprint automation: start, close, carry over unfinished | |
| PM-92 | Retrospective board template | |
| PM-93 | Bugs queue / item types (task, bug, story) | |

## 10. Collaboration (P2)

| ID | Item | Today |
| --- | --- | --- |
| PM-100 | Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies | File-only extension; no backend Comment model |
| PM-101 | Activity log per item | None |
| PM-102 | Notifications inbox | None |
| PM-103 | Forms that create tasks (public or internal) | None |
| PM-104 | Embed live task lists / Gantt in documents (Monday Workdocs) | Documents exist; embedding does not |
| PM-105 | Whiteboard (Monday WorkCanvas) | None. P3. |
| PM-106 | Guests and per-board permissions (view-only, edit, owner) | `shares` exists: token links with view/edit on documents and folders; the `/shared/:token` page in the frontend is still a placeholder |
| PM-108 | **Collaborate on entire folders** (Alex, 2026-10-13): invite named people to a folder with viewer / commenter / editor / owner roles; access covers every document, file, task and sub-folder inside it | Today each Space belongs to one user (`workspaces.user_id`) and sharing is by anonymous token link only. Needs a `folder_memberships` table (user, folder, role), inherited by sub-folders, plus invite-by-email and a "Shared with me" list. Real-time co-editing already exists via `collab-server`. |
| PM-109 | **Comments on documents** (Alex, 2026-10-13): others can comment on a document, either on a highlighted passage (inline) or on the document as a whole, with replies, @mentions, resolve/reopen and notifications | No Comment model in the backend. Default: one polymorphic `comments` table shared with PM-100, with an optional anchor (text range in the doc) for inline comments. Needs commenter role from PM-108. |
| PM-107 | Board / item templates (project template, roadmap template, sprint template) | None |

## 11. Platform, AI, admin (P3)

| ID | Item | Notes |
| --- | --- | --- |
| PM-110 | Public API (REST today; Monday uses GraphQL) and webhooks | |
| PM-111 | Integrations: Slack, GitHub/GitLab, Google Calendar, email-to-task | |
| PM-112 | AI: summarize a milestone/initiative, generate tasks from a description, AI fields (categorize, extract, summarize) | Monday sidekick / AI columns. |
| PM-113 | Audit log, SSO, MFA, data export | |
| PM-114 | Mobile apps | macOS app exists; iOS/Android do not. |

## 12. Feature folders (P0)

Requested by Alex on 2026-10-13. A feature folder holds a hierarchy of features, each written as a business or product requirements document. Tasks are created from those feature documents, and opening the project folder shows a rollup of all tasks under each feature.

```
Project folder            (click it: task rollup per feature)
└── Feature folder
    └── Feature           (requirements doc)
        └── Sub-feature   (requirements doc, any depth)
            └── Tasks created from the doc
```

Today: folders already nest to any depth (`folders.parent_id`, `Folder#self_and_descendant_ids`), documents live in folders, and tasks already carry `document_id` and `folder_id`. What is missing is a way to mark a folder or document as a feature, task creation from inside a feature doc, and the per-feature rollup.

| ID | Item | Notes |
| --- | --- | --- |
| PM-120 | **Feature folder type**: a folder flagged as holding features | Default: a `kind` column on `folders` (`regular` / `feature`) rather than a new table, so existing folder nesting, sharing and archiving keep working. |
| PM-121 | **Feature hierarchy**: features nest under features, each one a requirements document | Default: each feature is a document plus an optional `parent_feature` link, so a feature's doc and its children sit together. |
| PM-122 | **Requirements template** for new feature docs (problem, goals, user stories, acceptance criteria, out of scope) | |
| PM-123 | **Create tasks from a feature doc**: select text or an acceptance criterion and turn it into a task linked back to the feature (`tasks.document_id`) | `document_id` already exists on tasks. |
| PM-124 | **Project folder rollup**: clicking the project folder lists each feature with its task counts, % done, and status, including tasks from sub-features | Same counting approach as Epic/Initiative `tasks_count` / `done_tasks_count`. |
| PM-125 | Feature status and owner, derived from its tasks or set by hand | |
| PM-126 | Link features to the planning hierarchy (a feature can belong to an epic, initiative or milestone) | Ties into section 1. |

## 13. Files and images in collections (P1)

Requested by Alex on 2026-10-13: collections should let you upload files or images and keep them there.

"Collection" isn't a term in the codebase yet. This assumes it means a folder (project or feature folder) and the documents inside it. If it turns out to be a separate concept, these items move to it.

Today: `UploadsController` already stores images and video in ActiveStorage (100 MB cap, images/video only), but only so they can be embedded in a document. An uploaded file isn't an item of its own: it doesn't show in the folder, and nothing lists it.

| ID | Item | Notes |
| --- | --- | --- |
| PM-130 | **Upload files and images into a folder** as items of their own, listed alongside documents, spreadsheets and tables | Default: a new `doc_type: file` on `documents` with an ActiveStorage attachment, so files inherit folder placement, pinning, sharing and archiving. |
| PM-131 | Allow any file type (PDF, Office docs, zip, etc.), not just images and video | `UploadsController::ALLOWED_TYPES` limits uploads to images and video today. |
| PM-132 | Drag-and-drop and multi-file upload onto a folder | |
| PM-133 | Previews: image thumbnails, a grid/gallery view, inline PDF and video preview | Pairs with PM-65 (files gallery). |
| PM-134 | Download, rename, move, delete, replace with a new version | |
| PM-135 | Attach uploaded files to tasks and features | Ties into section 12. |
| PM-136 | Storage quota per Space and a per-file size limit | Production uses ActiveStorage `:local` today; large uploads need real object storage (see `docs/storage-options.md`). |
| PM-137 | **Any file type embedded inside a document** (Alex, 2026-10-13): audio/music (mp3, m4a, wav, flac, ogg) with an inline player, video (already works), and any other file (PDF, zip, Office docs) as an attachment card with name, size, type icon, preview and download | Today the editor accepts images and video only: `DocumentScreen.tsx` filters drops/pastes to `image/*` and `video/*`, and `UploadsController::ALLOWED_TYPES` has no audio or other types. Needs an Audio node and a File-attachment node in the editor, and the allow-list widened (shares the work in PM-131). |

## 14. Paragraph styles in documents (P1)

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

| ID | Item | Notes |
| --- | --- | --- |
| PM-140 | **Built-in paragraph styles**: Title, Subtitle, Heading 1–3, Body, Quote, Caption, Monospace | Like the style menu in Quip, Google Docs and Pages. |
| PM-141 | **Style picker** in the editor toolbar that applies a style to the current paragraph | |
| PM-142 | **Create a custom style** from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it | |
| PM-143 | **Custom styles are per user and global**: saved to the user's account and available in every document they edit | Default: a `paragraph_styles` table keyed to `user_id` (or a JSON column on `users`). Rendered as a Tiptap attribute on the block, e.g. `data-style="my-callout"`. |
| PM-144 | Edit or delete a custom style; documents that use it update | Needs a fallback when a style is deleted: render as Body. |
| PM-145 | How other people see your custom styles in a shared document | Open question: since styles belong to one user, a collaborator either sees the formatting copied into the doc, or the style travels with the doc. Default: the doc stores the resolved formatting so it looks the same to everyone. |
| PM-146 | Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1) | |

## 15. Document linking, navigation and URLs (P1)

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

| ID | Item | Notes |
| --- | --- | --- |
| PM-150 | **Link to another document** from inside a document, with a search picker (type `[[` or `@`) | Link shows the target's current title, and updates when it's renamed. |
| PM-151 | **Link to a heading** in another document (or the same one) | Headings need stable ids that survive edits and collaboration. Default: an `id` attribute on Tiptap heading nodes, generated once. The URL uses `#heading-slug`. |
| PM-152 | Backlinks: each document lists which documents link to it | Needs a `document_links` table refreshed on save. |
| PM-153 | Broken-link handling when a target doc or heading is deleted | Show the link as broken rather than removing it. |
| PM-154 | **Table of contents as a minimap**: a slim outline of headings at the side of the document that highlights where you are and jumps on click | Built from the heading nodes; collapses to tick marks when narrow, like a code-editor minimap. |
| PM-155 | **Hierarchical URLs** that mirror the folder tree, e.g. `/acme/product/feature-folders/requirements` | Default: slugs on folders and documents, unique within their parent, with the numeric id kept as a fallback so links don't break when something is renamed or moved (old paths redirect). |
| PM-156 | **Folder home document**: a folder can have one document set as its home page, shown when the folder is opened | Default: `folders.home_document_id`. |
| PM-157 | Folders without a home document show the files and folders directly inside them (one level, not everything nested) | Today's folder view also lists nested content for some views (`Folder#self_and_descendant_ids`); the default listing should be direct children only. |
| PM-158 | **Breadcrumb path above the document name** (Alex, 2026-10-18): Space › folder › sub-folder › document, each part a link | Today the document screen (`view/document/DocumentScreen.tsx`) opens straight on the toolbar and title with no path. The data is there: documents have `folder_id` and folders chain up through `parent_id` to the Space's Root. Pairs with PM-155 (URLs that follow the same path). |

## 16. Frontend conventions follow-up (P1)

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

| ID | Item | Notes |
| --- | --- | --- |
| PM-160 | **Visual QA of every screen in light and dark mode** after the Tailwind removal | The conversion was done without a browser. Check hover/focus states, the sidebar, kanban drag overlay, calendar grid, document toolbar, and the Electron/iOS/Mac WebView shells. |
| PM-161 | Reconcile the "UI component organization" section of `AGENTS.md` with the Views rules | Pages now live in `frontend/src/view/<name>/` per "Views" and "Frontend Views". The UI-component section still says React screens belong in `components/screens/` and auth UI in `components/auth/`; update that text. |
| PM-162 | Promote repeated local patterns into `components/ui` | Underline-only input/select, muted-text link, icon-size helper, danger-hover icon button, tab/segmented control, sortable table header, save-status indicator. |
| PM-163 | Data files and `util/` (partly done) | Done: `src/data/` (`folder`, `task`, `document`, `schedule`) and `src/util/` (`date`, `color`) hold the pure helpers that used to live in screens, with unit tests. Remaining: filtering/sorting inside `TasksScreen`, `EventsScreen` and `DocumentsIndexScreen`, and enums mirrored from the API. |
| PM-164 | Base API file plus one class per model | `src/api/` has one module per model but no shared base class. |
| PM-165 | Clear ESLint warnings deliberately | The React Compiler rules in `react-hooks` v7 (`refs`, `set-state-in-effect`, `static-components`) and `exhaustive-deps` are warnings. Each fix edits working code, so do them one component at a time with tests. |
| PM-166 | Lint the whole repository (partly done) | Done: root `npm run lint` runs ESLint + Stylelint in `frontend/` and ESLint in `collab-server/`. Remaining: Ruby (`rubocop`) and Swift linters in the same entry point. |
| PM-167 | WCAG 2.1 audit (started) | Done: `TabBar` tabs and close controls are real buttons with names. Remaining: keyboard paths for every interactive element, focus order in modals, color contrast in both themes. |
| PM-168 | Teams: groups of users that can be granted a role in a Space | Builds on `workspace_memberships` (see `docs/spaces.md`). |
| PM-169 | Invite people without an account (email invitation, pending membership) | Today members are added by the email of an existing user. |
| PM-170 | Move or copy content between Spaces | A document stays in its Space today. |

## 17. Onboarding (P1)

Alex asked (2026-10-18) for suggestions after signing up: create a Space and learn what Spaces are for, create a document and a Sheet, create tasks, and anything else useful. Done: a getting-started checklist on the Space home for new accounts, which also suggests inviting a teammate and opening the roadmap (see `docs/onboarding.md`).

| ID | Item | Notes |
| --- | --- | --- |
| PM-171 | Store checklist progress on the server | Today it lives in `localStorage`, so it doesn't follow the user to another device or the Mac app. |
| PM-172 | A way to reopen the checklist after hiding it | For example from the account menu. |

## 18. Spaces: switcher and features (P1)

Requested by Alex on 2026-10-18.

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-180 | **Current Space always visible at the top left** | Partly there: the sidebar header shows "Inertia" with the Space name under it (`components/workspace/WorkspaceSwitcher.tsx` inside `file-manager/Sidebar.tsx`). It is easy to miss (small secondary text) and isn't visible where the sidebar is hidden, such as on phones. | Make the Space name the prominent line in that corner, on every screen and in the Mac app. |
| PM-181 | **Dropdown to change Spaces, with "New Space…" in it** | Partly there: clicking the Space name opens a modal listing Spaces, with "New space" and "Members" buttons under the list. | Replace the modal with a real dropdown menu anchored to the Space name: Spaces with a check on the current one, then "New Space…" (opens the name prompt) and "Members…", all keyboard navigable. |
| PM-182 | **Choose which features a Space uses** when creating or editing it, e.g. Sprints, Milestones, Initiatives, OKRs, Roadmap, Events | Not present. `workspaces` has only name, owner, root folder and `personal`; the sidebar rail shows every section to everyone. | Default: a `features` JSON column on `workspaces` (all on for existing Spaces), a checklist in the New Space dialog and in Space settings, and the rail, quick add and screens hide what's off. Turning a feature off hides it; no data is deleted. Owners/managers edit it. |

## 19. Space files and projects (P0)

Requested by Alex on 2026-10-18: in each Space, see all the files in that Space, and make projects with docs inside.

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-190 | **All files in a Space**: one list of every doc, sheet and table, wherever it is nested, with its folder path and search | Built: the Documents page is now "All files" with search and full folder paths (`view/documents_index/`). | Uploaded files join this list once PM-130 lands. |
| PM-191 | **Projects that hold docs**: create a project, see its docs (including subfolders), add docs to it | Built: `folders.kind` (`folder` / `project`), a Projects page (`view/projects/`), a project icon in the sidebar tree, and "Make Project" / "Make Folder" on any folder but Root. | PM-120's `feature` folder type can be another `kind` value. |
| PM-192 | Project details: owner, status, dates and a description | Not present | Feeds the portfolio view (PM-30). |
| PM-193 | Filter All files by project, type and owner | Not present | |

## 20. Design system: Volta (P1)

Alex asked (2026-10-18) to use Volta (github.com/kriogenx0/volta) as the design system. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

| ID | Item | Notes |
| --- | --- | --- |
| PM-194 | Native macOS SwiftUI screens (login, local task files) use Volta's colors | They use system colors today. |
| PM-195 | Move the fixed status palette (blue/green/red/purple in `_tokens.scss`) onto Volta tokens | Volta has `--v-color-danger` and `--v-color-success` only; add the rest to Volta first. |
| PM-196 | Appearance settings: light/dark/system and accent color, as Volta's `Theme` API does | The tokens already support `data-theme` on `<html>` and a runtime `--v-accent`. |



Monday sells separate CRM, Service (ticketing), Campaigns and "vibe" app-builder products on the same platform. They are not project management and are left out unless someone asks.

## 21. Plan from a single document (P0)

Requested by Alex on 2026-10-18, marked as one of the most important things to them: from one document, create tasks, add dates or events, and set an initiative with its start and end date, all without leaving the document.

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-210 | **Create tasks from the document** | Built: a checklist item in a document becomes a Space task on save (`syncTaskNodes` in `view/document/DocumentScreen.tsx`, `tasks.document_id`). | Remaining: set a task's dates, assignee and status from the line itself (no task detail view yet, see PM-04/PM-11). |
| PM-211 | **Create dates and events from the document**: type or pick a date inline (e.g. `@date` or `/event`), and it becomes a calendar event linked back to that spot | Not present. `events` has `folder_id` but no `document_id`, so an event can't point at a document. | Default: add `events.document_id` and an inline event node like the task item. Editing either side updates the other. |
| PM-212 | **Set the document's initiative, with start and end date**, from the document itself (a header field or a block at the top) | Not present. `initiatives` has `start_date` and `target_date` but no link to documents; initiatives are only made on the Initiatives page. | Default: a document can create or pick one initiative. Its tasks and events roll up to it, and its dates show on the Roadmap and Gantt. Pairs with feature folders (section 12), where a feature document plays the same role. |
| PM-213 | Planning summary at the top of the document: initiative, dates, task progress and upcoming events | Not present | Reuses `HealthBadge` and the progress bar. |
| PM-214 | **Collapse any document to just its tasks** (Alex, 2026-10-18): a toggle on every document that hides the prose and shows only the tasks in it, still grouped under their headings, then expands back | Not present in the editor. The data exists: tasks keep `document_id`, and `GET /api/v1/tasks?document_id=` lists a document's tasks. | Default: a "Tasks only" toggle in the document toolbar that folds every non-task block in place (not a separate page), so checking, renaming and dates work as normal. Headings stay visible as the epic/feature grouping. Works with PM-213's summary and PM-220's two-way sync. |

## 22. Requirement docs, project types, releases and recurring work (P0)

Requested by Alex on 2026-10-18: write product requirement documents that turn into tasks and stay in sync both ways; support every kind of project, not only software (Alex often writes a document per song and tracks the work for a release: a song, an album, a music video); tasks can be recurring or ongoing, and those should notify the person and ask for an update.

### How other tools handle this (light research, 2026-10-18)

- **Doc to tasks, both ways**: Jira + Confluence (create issues from requirement text; issue status shows inline in the page), Notion (a page embeds a synced task database), Linear (project documents next to the project's issues), Quip (live checklists). The common pattern is that the document holds a live reference to the task, so status shown in the doc is always the task's real status.
- **Project types as templates**: Monday, Asana and ClickUp start projects from templates per kind of work (software launch, marketing campaign, event, content calendar). A template is a document skeleton plus default task lists, fields and views.
- **Music releases**: release plans are usually worked back from the release date: writing, recording, mixing and mastering, artwork, credits and metadata (ISRC per track, UPC per release), distributor upload, streaming-editorial pitch (Spotify for Artists asks for at least 7 days before release, and earlier is better), music video, promo and social posts, then post-release follow-up. One song can belong to several releases (single, then album).
- **Recurring and ongoing work**: Asana and Todoist repeat a task on a schedule (every week, the 1st of the month, N days after completion). Basecamp's automatic check-ins ask a person a question on a schedule ("What did you work on this week?"); Monday's update requests ask an owner for a status. An ongoing task never completes; it is checked in on.

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-220 | **Requirement doc ↔ tasks, synced both ways** | Partly built: a checklist line becomes a task on save (PM-210); the line shows the task's live status and due date and can set the due date (`components/editors/WorkspaceTaskItemView.tsx`). Not synced: renaming the task elsewhere doesn't update the line, deleting either side doesn't affect the other, and the checkbox and task status are not tied together. | Rule: the task is the source of truth; the line is a live reference to it. Edits on either side update both. Deleting the line asks whether to delete or keep the task. |
| PM-221 | **Product Requirements Document template** that creates its tasks | Not present (PM-122 covers a feature doc template). | Sections: problem, goals, users, requirements (each a task line), acceptance criteria, out of scope, milestones. Uses PM-212 to set the initiative and dates. |
| PM-222 | **Project types**: software, music release, video, event, marketing campaign, writing/content, personal, and blank | Not present. Folders have `kind` (`folder`/`project`) only. | A type sets the starting template, the default task lists and fields, and the features the Space or project uses (ties to PM-182 and PM-191). Users can save their own project as a type. |
| PM-223 | **Releases**: a release (single, EP, album, music video) with a release date, its songs, and its tasks | Not present | A release is a milestone-like item; a song document can belong to more than one release. Release view shows every task for that release, from every song document. |
| PM-224 | **Release plan worked back from the date**: pick a release date and get the standard tasks with due dates counted back from it | Not present | Default music checklist from the research above. Moving the release date moves the tasks. Same mechanism works for any dated project type (an event, a launch). |
| PM-225 | Song document template | Not present | Lyrics, credits (writers, producers, performers), key/BPM, versions and stems, metadata (ISRC), and a task list for that song. |
| PM-226 | **Recurring tasks**: repeat on a schedule or a set time after completion | Not present (listed as PM-74 under automations; this replaces it). No recurrence field on `tasks`. | Default: store an RRULE-style rule on the task and create the next occurrence when one is done. |
| PM-227 | **Ongoing tasks with check-ins**: a task that stays open and asks its owner for an update on a schedule | Not present | The check-in arrives as a notification (needs PM-102, the notifications inbox; email/push later). The answer is saved as an update on the task, so its history reads like a log. Overdue check-ins show on the task as stale. |

## Suggested first slice

1. PM-01, PM-02, PM-03, PM-04: Milestone + Initiative models and rollups.
2. PM-05: hierarchy tree view.
3. PM-11, PM-10, PM-17: task start dates and a read-only Gantt.
4. PM-20, PM-22: roadmap view over initiatives/epics grouped by milestone.
5. PM-13, PM-12, PM-14, PM-15: dependencies and interactive Gantt.

## Open questions

- Migrate existing `event_type: milestone` events into the new Milestone table, or keep both?
- Does the Gantt / roadmap need to ship in the macOS online mode at the same time as the web?

## Sources

- [monday.com: The Board Views](https://support.monday.com/hc/en-us/articles/360001267945-The-Board-Views)
- [monday.com Features: A Complete Breakdown in 2026 (ZoomInfo)](https://pipeline.zoominfo.com/sales/monday-com-features)
- [monday.com blog: free Gantt chart software](https://monday.com/blog/project-management/free-gantt-chart-software/)
- Column-type and dependency-mode details are from training knowledge (cutoff mid-2026), not re-checked live.
- [Spotify for Artists: pitching music to playlist editors](https://support.spotify.com/us/artists/article/pitching-music-to-playlist-editors/)
- [Basecamp: automatic check-ins](https://basecamp.com/features/checkins)
- Section 22 tool comparisons (Jira/Confluence, Notion, Linear, Asana, Todoist, Monday update requests) are from training knowledge, not re-checked live.

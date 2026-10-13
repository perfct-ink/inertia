# Backlog: Monday.com feature parity

Date: 2026-10-11  
Status: backlog, not a commitment or a sequence of sprints. Nothing below is built unless the "Today" note says so.

Goal: cover everything Monday.com Work Management offers, with Gantt charts, Initiatives, product roadmaps and a task hierarchy as the headline items, all rolling up under a Milestone.

Related: `docs/project-management-features.md` (gap analysis vs. Jira) already covers Initiatives, Timeline/Gantt, Sprints, dependencies and reporting. This backlog reuses that analysis and widens it to Monday's full surface. Where the two overlap, the item here points back to it rather than repeating the reasoning.

## How to read this

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
| PM-01 | **Milestone as a first-class model** (`milestones`: title, description, target date, status, owner, workspace, folder). Flat: milestones do not nest (decided 2026-10-11) | Milestones exist only as `events.event_type = milestone`, linked to tasks through `event_tasks` | Keep the Event for calendar display, or migrate it. Default: new `Milestone` table, migrate existing milestone events into it, keep `event_tasks` for deadlines only. |
| PM-02 | **Milestone rollup**: progress %, count of open/done items, health (on track / at risk / off track) computed from everything beneath it | Epic already has `tasks_count` / `done_tasks_count` | Same grouped-count approach as `EpicsController#index`, one level up. |
| PM-03 | **Initiative model** above Epic (title, description, owner, start/target date, status, `milestone_id`) | **Partly built** (2026-10-12): `Initiative` with title, start/target date, task rollup, `InitiativesPage.tsx`. Missing: description, owner, status, `milestone_id` | Shape mirrors Epic → Task. See `project-management-features.md` sequence step 2. |
| PM-04 | `epics.initiative_id`, `epics.milestone_id`, `tasks.milestone_id` | `epics.initiative_id` built (2026-10-12); milestone columns missing | Inheritance rule above; explicit value overrides inherited. |
| PM-05 | **Hierarchy tree view**: Milestone → Initiative → Epic → Task → Subtask, expand/collapse, inline progress bars at each level | `TasksPage.tsx` shows subtasks with depth filters; `EpicsPage.tsx` is a flat list | Monday equivalent: items + subitems, plus Portfolio boards linking projects. |
| PM-06 | Move/reparent anywhere in the tree by drag-and-drop | Task reparenting validated in `Task#parent_is_not_self_or_a_descendant` | Extend the same cycle check to epic↔initiative↔milestone moves. |
| PM-07 | Local `.inertia-tasks` file format gains Initiative + Milestone levels | File format has Epics, Sprints, Milestones (via Events) | Open question carried over from `project-management-features.md`. Default: hosted first, file format follows. |

## 2. Gantt chart (P0)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-10 | **Gantt view** for tasks, epics, initiatives: bars from start to end date, grouped by hierarchy, milestone diamonds on the axis | **Partly built** (2026-10-12): shared `components/Timeline.tsx` renders read-only bars for epics, initiatives and a per-folder Gantt tab. Missing: task bars, hierarchy grouping, milestone markers | Needs PM-11 first for task bars. |
| PM-11 | `tasks.start_date` (keep `due_date` as end) | Missing | Monday uses a single Timeline column (start + end). |
| PM-12 | Drag a bar to reschedule, drag an edge to resize | n/a | |
| PM-13 | **Dependencies**: finish-to-start, start-to-start, finish-to-finish, start-to-finish, drawn as arrows | No link table | New `task_dependencies` join table. Also Jira-doc sequence step 5. |
| PM-14 | Dependency scheduling modes: strict (block invalid dates), flexible (auto-shift successors), none | n/a | Monday offers these three modes per board. |
| PM-15 | **Critical path** highlight | n/a | Needs PM-13. |
| PM-16 | **Baselines**: snapshot planned dates, show planned vs. actual bars | n/a | |
| PM-17 | Zoom: days / weeks / months / quarters / years; "today" line; weekends shaded or skipped | n/a | |
| PM-18 | Export Gantt to PNG / PDF | n/a | |
| PM-19 | Native macOS online Gantt | Named a future stage in `macos/README.md` | Same API as web. |

## 3. Product roadmap (P0)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-20 | **Roadmap view**: initiatives and epics as swimlanes on a quarter/month axis, grouped by milestone | Not present | Monday: Roadmap template + Timeline view + Portfolio. |
| PM-21 | Now / Next / Later board mode (no dates required) | Not present | Useful before dates are known. |
| PM-22 | Roadmap status and health per initiative, rolled up from epics | Needs PM-02 | |
| PM-23 | Shareable read-only roadmap link (external stakeholders) | `shares` table exists for documents | Reuse the share mechanism. |
| PM-24 | Idea / feature-request intake that can be promoted to an epic or initiative | Not present | Monday: WorkForms + intake boards with approval. |

## 4. Portfolio, goals, resources (P1)

| ID | Item | Today | Notes |
| --- | --- | --- | --- |
| PM-30 | **Portfolio view**: every project (folder) with owner, status, health, dates, progress in one table | Folders exist, no portfolio rollup | Monday Portfolio (Enterprise). |
| PM-31 | **Goals / OKRs** linked to initiatives, with key-result progress from linked work | Not present | |
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
| PM-61 | Kanban: group by any field, swimlanes, WIP limits, configurable columns | Kanban exists on the fixed status enum |
| PM-62 | Calendar view of tasks (not only events) | Events have list/month views |
| PM-63 | Timeline view (simpler than Gantt: bars, no dependencies) | None |
| PM-64 | Cards / gallery view | None |
| PM-65 | Files gallery of all attachments | None |
| PM-66 | Map view (location field) | None |
| PM-67 | Pivot view | None |
| PM-68 | Saved views per user and shared views, saved filters | None |
| PM-69 | "My Work": everything assigned to me across the workspace, by date | None |

## 7. Automations (P2)

| ID | Item | Notes |
| --- | --- | --- |
| PM-70 | Rule builder: trigger → condition → action | Monday's core differentiator. |
| PM-71 | Triggers: status change, field change, item created, date arrives, subtask done, moved | |
| PM-72 | Actions: notify, assign, change status, move, create item, set date, create subtask | |
| PM-73 | Recipe templates (e.g. "when all subtasks done, mark parent done"; "when epic done, update milestone health") | Rollup recipes tie into PM-02. |
| PM-74 | Recurring tasks | |
| PM-75 | Automation run log and per-workspace limits | |

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
| PM-90 | Sprints as a Rails model (goal, dates, active sprint board) | Exists only as a local-file extension. Jira doc step 4. |
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
| PM-106 | Guests and per-board permissions (view-only, edit, owner) | `shares` exists for documents |
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
| PM-136 | Storage quota per workspace and a per-file size limit | Production uses ActiveStorage `:local` today; large uploads need real object storage (see `docs/storage-options.md`). |

## 14. Paragraph styles in documents (P1)

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentPage.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, code block, quote-like blocks). There is no style picker, no named styles, and nothing style-related stored on `users`.

| ID | Item | Notes |
| --- | --- | --- |
| PM-140 | **Built-in paragraph styles**: Title, Subtitle, Heading 1–3, Body, Quote, Caption, Monospace | Like the style menu in Quip, Google Docs and Pages. |
| PM-141 | **Style picker** in the editor toolbar that applies a style to the current paragraph | |
| PM-142 | **Create a custom style** from the current paragraph's formatting (font, size, weight, color, spacing, alignment) and name it | |
| PM-143 | **Custom styles are per user and global**: saved to the user's account and available in every document they edit | Default: a `paragraph_styles` table keyed to `user_id` (or a JSON column on `users`). Rendered as a Tiptap attribute on the block, e.g. `data-style="my-callout"`. |
| PM-144 | Edit or delete a custom style; documents that use it update | Needs a fallback when a style is deleted: render as Body. |
| PM-145 | How other people see your custom styles in a shared document | Open question: since styles belong to one user, a collaborator either sees the formatting copied into the doc, or the style travels with the doc. Default: the doc stores the resolved formatting so it looks the same to everyone. |
| PM-146 | Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1) | |

## Out of scope for parity

Monday sells separate CRM, Service (ticketing), Campaigns and "vibe" app-builder products on the same platform. They are not project management and are left out unless someone asks.

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

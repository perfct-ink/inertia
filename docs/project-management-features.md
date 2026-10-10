# Project management depth: Inertia vs. Jira

Date: 2026-10-09  
Status: gap analysis and options, not an implementation plan. Nothing here is built; this exists to decide what to build next.

## Caveat on "what Jira has now"

This environment has no network access, so this is written from training knowledge (cutoff January 2026), not a live re-check of Jira's current docs or UI. Treat specifics (exact feature names, which tier something ships in) as likely-correct, not verified today. Worth a quick confirm against Jira's actual current site before committing engineering time to match something specific.

## Recommendation

Don't aim for full Jira parity — it's a mature product built by a large team over two decades, and a lot of its surface area (custom workflows, custom fields, cross-project capacity planning) is complexity Inertia has deliberately avoided so far. Aim instead for the subset that (a) extends the hierarchy Inertia already has — Task → Epic — one level up to Initiative, and (b) brings the **online** workspace up to what the **local `.inertia-tasks` files** already do (Workboard, Sprints, Epics, Milestones), since that gap is real, already named in `macos/README.md`'s "future stages," and bigger in practice than anything missing relative to Jira specifically.

## What exists today

Three distinct surfaces exist. Worth being precise about which one is missing what, since they currently have different feature sets:

**1. Web app (Rails + React), hosted/multi-user** — the actual day-to-day product.
- Tasks: a kanban board with backlog/board toggle, drag-and-drop across `backlog → todo → in_progress → in_review → done`, subtasks to any depth (`frontend/src/pages/workspace/TasksPage.tsx`, `backend/app/models/task.rb`). This already exists — if you haven't seen it, it's the "Board" toggle at `/tasks?view=kanban`.
- Epics: grouping plus live progress counts (`tasks_count`/`done_tasks_count`) and `start_date`/`target_date`, but no visual board or timeline rendering of those dates (`backend/app/models/epic.rb`, `frontend/src/pages/workspace/EpicsPage.tsx`).
- Events: `deadline` and `milestone` types, list/month calendar views, no Gantt/timeline rendering (`backend/app/models/event.rb`, `EventsPage.tsx`).
- Nothing named sprint, initiative, dependency/link, estimate, or custom workflow/field exists anywhere in `backend/db/schema.rb` — confirmed directly, not inferred.

**2. Native macOS app (SwiftUI), online/hosted mode** — talks to the same Rails API as the web app.
- Per its own README (`macos/README.md`): sign-in, nested project navigation, document lists/dashboards, task creation/completion, an event agenda. Documents/spreadsheets reuse the existing web editors inside a WKWebView.
- No board, no Epics view, no Gantt in this mode. The README is explicit that this is intentional and temporary: *"Native online Workboard/Gantt views, file syncing, persistent Keychain login, and native rich text/spreadsheet editors are future stages."* Confirmed in source too — `Workboard` only appears in `TaskFileView.swift` and `TaskFile.swift`, both exclusively part of the local-file code path below, not the online one.

**3. Native macOS app, local `.inertia-tasks` files** — offline, single-user, no server involved.
- Already has real depth: a **Workboard** with custom, reorderable, renameable columns (and a per-column "counts as done" flag), a **List** view, **Sprints** (goal, start/end dates, filter the board to one sprint, completion %), **Epics** (start/target dates, completion bars), **Milestones** (via Events), comments, assignees, descriptions — see `docs/task-file-format.md` and `macos/README.md`.
- Explicitly **not synced** to the hosted workspace. `docs/storage-options.md` already made this call deliberately: two clearly separate modes, connected later by explicit import/export, not continuous bidirectional sync. Sprints and comments are literally called out there as file-only "extensions" because "the backend currently has no Sprint or Comment entity."

**The likely real gap:** the richer feature set (Workboard/Sprints/Epics/Milestones) already exists, but only inside local files on macOS. The thing most people actually use — the web app, and the native app's online mode — has a plainer board and a bare epic list, no timeline anywhere, and no Initiatives at any layer, online or local.

## Gap analysis vs. Jira

| Capability | Jira (Software Cloud, roughly current) | Inertia today | Natural home if added |
| --- | --- | --- | --- |
| Issue hierarchy | Initiative → Epic → Story/Task/Bug → Subtask | Epic → Task → subtask (unlimited depth); no Initiative level | New `Initiative` model one level above `Epic`, same shape as the existing Epic→Task relationship |
| Kanban board | Configurable columns↔statuses, swimlanes, WIP limits, saved quick filters | Fixed columns = the 5-value status enum; no swimlanes, WIP limits, or saved filters | Extend `TasksPage.tsx`'s existing `KANBAN_STATUSES`; swimlanes-by-epic would mirror how the local-file Workboard already groups by sprint |
| Backlog & estimation | Ranked backlog, story points, sprint planning ceremony | Backlog view exists; ordering is just `position`, no estimate field | Add an `estimate` column plus drag-to-rank |
| Sprints | Core Scrum unit — planning, active sprint board, burndown, velocity | Exists only as a **local-file extension** (`extensions.sprints`); zero backend support | Needs a real `Sprint` Rails model + API — this is the first row that's pure net-new backend, not just UI |
| Timeline / Gantt | Built-in Timeline on every Epic (dates + drag to reschedule); Advanced Roadmaps for cross-project | None online. Already named a future stage in `macos/README.md`. Epics already have `start_date`/`target_date` — the raw data for a basic timeline already exists | A read-only bar-chart timeline off existing Epic dates is the cheapest first step, web or native |
| Dependencies | Issue links (blocks / is blocked by / relates to / duplicates), rendered on Timeline | None — no issue-linking table at all | New join table + a couple of link types; wanted before Timeline is more than decoration |
| Initiatives | Optional top level above Epic | Not present anywhere, web or native | Same model as the hierarchy row above |
| Custom workflows / fields / issue types | Per-project statuses, transitions, custom fields, multiple issue types | Fixed 5-status enum, fixed field set, one issue "type" (Task) | Real scope-creep risk — see below |
| Automation rules | Trigger → condition → action | None | Needs the rest of this table to exist first; nothing to automate yet |
| Reporting | Burndown, velocity, Cumulative Flow Diagram, dashboards | None | Needs Sprints (above) plus some status-change history, which also doesn't exist today |

Milestones are a partial exception to "Inertia is behind": Jira doesn't have a clean first-class equivalent (teams usually fake it with Versions/Releases, or just an Epic with a due date). Inertia's `Event` with `event_type: milestone` is already a reasonable answer to that — the gap there is visibility/UI, not data model.

## What I'd push back on copying

- **Custom workflows/fields/issue types.** This is also Jira's most-complained-about source of complexity. Inertia's fixed, opinionated status set reads as a deliberate feature given the product's own "one workspace instead of five apps" pitch (`backend/app/views/marketing/home.html.erb`). I'd only add this on a specific, concrete request a 5-status enum can't express — not preemptively.
- **Cross-project capacity planning (Advanced Roadmaps).** Real engineering cost, and nothing in this codebase today spans more than one workspace per account — there's no multi-project concept to plan capacity across yet.
- **Automation rules.** Needs most of the rest of this list to exist first; building it earlier has nothing to automate over.

## A possible sequence, not a commitment

1. **Epic progress bar + a read-only timeline, online.** The data (`start_date`/`target_date`, `tasks_count`/`done_tasks_count`) already exists in `backend/app/models/epic.rb` — this is almost entirely frontend work.
2. **Initiatives**, modeled the same way `Epic` sits above `Task` — the smallest net-new backend surface on this list.
3. **Bring the online Workboard toward the local-file one** (swimlanes by epic, reorderable/renameable columns) — this is already `macos/README.md`'s own stated direction, not a new one.
4. **Sprints, for real, in Rails.** First item here that needs new backend models rather than just UI — currently a file-only extension by explicit, documented choice.
5. **Dependencies/links** — makes a Timeline view show more than a bar chart.
6. **Reporting** (burndown/velocity/CFD) — needs Sprints (4) and status-change history that doesn't exist yet.

Each step ships independently and none of them require revisiting the file-sync question `storage-options.md` already deferred on purpose.

## Open questions before writing any code

- Does "Gantt chart" mean the web app, the native macOS online mode, or both? ("Native online Workboard/Gantt views" is already on the macOS roadmap in its own README — this might just mean prioritizing that.)
- Is "Initiatives" meant for the hosted workspace only, or should the local `.inertia-tasks` format grow a matching level too (another `docs/task-file-format.md` revision)?
- Is there real appetite for Sprints becoming an actual Rails model, given `storage-options.md` named their absence as a deliberate gap rather than an oversight?

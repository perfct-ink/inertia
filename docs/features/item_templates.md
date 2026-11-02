# Item templates (projects, roadmaps and sprints)

## What it does
A **From template** button on the Projects, Roadmap and Sprints pages opens a dialog that creates a ready-made project, roadmap or sprint from a built-in template. Pick a template (each shows what it adds), give it a name and a start date where that applies, and it creates the item with its starter content. The page's list refreshes when it is done; there is no redirect.

| Page | Dialog | Asks for | Templates |
| --- | --- | --- | --- |
| Projects (`/projects`) | New project from a template | Name (blank uses the template name) | Software project, Marketing campaign, Event |
| Roadmap (`/roadmap`) | Add a roadmap from a template | Start date (default today) | Product launch, Quarterly plan |
| Sprints (`/sprints`) | New sprint from a template | Name (blank uses "Sprint starting Nov 2"), start date (default today) | Two-week sprint, One-week sprint |

- **Project templates** create a project folder (`kind: project`, in the Space's Root), blank starter documents and sheets in it (for example Product requirements, Technical design, Meeting notes; Campaign brief and a Budget sheet; Run of show and a Guest list sheet), and starter tasks in the project folder with status To do (`tasks.folder_id`). The documents are empty apart from their titles.
- **Roadmap templates** create milestones with target dates counted in weeks from the start date, and one initiative per milestone. Each initiative runs from the previous milestone's date (the start date for the first) to its own milestone's date, is attached to its milestone, and is placed by hand on the Now / Next / Later board: the first on Now, the second on Next, the rest on Later. Everything starts as Planned.
- **Sprint templates** create a Planned sprint (14 or 7 days, so the end date is the start plus 13 or 6 days) and starter tasks (planning, a mid-sprint check-in for two weeks, review, retrospective) assigned to it, due on the day they belong to. Tasks have status To do.

## API and models
No new endpoints or tables. `frontend/src/api/templates.ts` carries a plan out through the model API classes (`folderApi`, `documentApi.createIn`, `taskApi`, `milestoneApi`, `initiativeApi`, `sprintApi`; see [api_layer.md](api_layer.md)), one request at a time and in order: folder, then its documents and tasks; milestone, then its initiative; sprint, then its tasks. `InitiativeApi`'s create input was widened so a new initiative can carry its milestone, dates, status and horizon. Failed requests also raise the usual error notice from the HTTP client; the dialog shows the same error inline. After the plan finishes or stops, the workspace, folder-contents, tasks, milestones, initiatives and sprints queries are refetched (`useApplyTemplate`, which refetches on failure too, unlike `useApiMutation`).

The templates and the plan each one turns into (names, dates, horizons, task order), the order records are made in (`applyPlan`) and the part-way failure message are pure code in `frontend/src/data/template.ts`; dates use `addDays` from `frontend/src/util/calendar.ts`. The dialog is `frontend/src/components/TemplatePicker.tsx` (`kind` prop: `project`, `roadmap` or `sprint`).

## Who can view and change
Anyone who sees the button can use it; the server applies the same rules as for each create endpoint on its own (Space scoping and the member's role). I did not add a role check in the UI, as with "New project" and "New sprint".

## Web entry points
`view/projects/ProjectsScreen.tsx`, `view/roadmap/RoadmapScreen.tsx` and `view/sprints/SprintsScreen.tsx` render `<TemplatePicker kind=... />` in their header. The dialog uses the shared `Modal`, `Input` (radio and text), `DatePicker` and `Button`, so it works at 375px and in dark mode through the shared tokens.

## Tests
`frontend/src/data/template.test.ts` (plans, dates, horizons, names, request order against a stand-in server, partial-failure message), `frontend/src/api/templates.test.ts` (each record goes through the right model class with the right field names, and a failure reports the server text and how far it got), `frontend/src/components/TemplatePicker.test.tsx` (dialog per kind, defaults, submit, error, pending). The Projects, Roadmap and Sprints screen tests mock `TemplatePicker`.

## Known limits
- The templates are built in. Users cannot save their own or edit the built-in ones (see `docs/backlog/save-roadmap-and-sprint-as-templates.md`; saving a project as a type is in `docs/backlog/project-types.md`).
- Project documents are blank: they have a title but no headings or task lines. Filled documents depend on the document templates (`docs/backlog/project-template-starter-documents-with-content.md`).
- The plan is applied from the browser as a series of requests, not one transaction. If one fails part-way, nothing is rolled back; the dialog says how many of the items were created ("3 of 9 items were added before it stopped") and the user finishes or deletes the rest by hand (see `docs/backlog/apply-template-on-server.md`).
- Roadmap templates are added to what is already there, not merged with it, so applying one twice makes two sets of milestones.
- Starter tasks are not linked to documents, and the project's tasks do not get dates.
- The sprint template does not skip weekends, and does not check that the sprint's dates fit between other sprints.
- A retrospective board template is a separate task (`docs/backlog/retrospective-board-template.md`).

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/project-and-item-templates`). Independent of the document templates on `backlog/requirements-template` and `backlog/prd-template-that-creates-tasks`: it does not touch `CreateItem` or `useNewDocument`.
- 2026-11-02: merged with main after the merge wave and adapted to it: the API base class and model classes, `DatePicker`, and the Roadmap header with the share link.
- Not implemented: user-saved templates, template content for documents, an atomic server-side apply, retrospective board template.
- Not verified: lint, type-check, the real Jest suite and the browser (375px and desktop, light and dark) and a run against a real backend did not run (no node_modules, no network, no database). Run offline in stand-in runners: the pure tests in `data/template.test.ts` (16 pass), and the `TemplatePicker` and `SprintsScreen` component tests under Jest with stubbed icons and a stand-in for Radix Dialog that honours `open` (11 pass). `api/templates.test.ts`, `ProjectsScreen.test.tsx` and `RoadmapScreen.test.tsx` need packages that are not installed here and were not run.

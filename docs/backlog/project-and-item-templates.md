---
branch: backlog/project-and-item-templates
priority: p2
depends_on: []
components: [frontend]
---
# Board / item templates (project template, roadmap template, sprint template)

## Objective

Board / item templates (project template, roadmap template, sprint template)

## Current state

None

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Board / item templates (project template, roadmap template, sprint template) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on the branch `backlog/project-and-item-templates`, not merged; main (merge wave of 2026-11-02) has been merged into it. Done: a **From template** button on the Projects, Roadmap and Sprints pages that creates a project (folder, blank starter files, starter tasks), a roadmap (milestones with initiatives on Now/Next/Later) or a sprint (dated starter tasks) from built-in templates, through the model API classes; see `docs/features/item_templates.md`. Follow-up work is split into `save-roadmap-and-sprint-as-templates.md`, `project-template-starter-documents-with-content.md` and `apply-template-on-server.md`. Frontend only, no migration. It does not touch the document templates on `backlog/requirements-template` and `backlog/prd-template-that-creates-tasks`.

Did not run (no network, `node_modules` or database): `npm run lint`, the TypeScript type-check, the real Jest suite (so `api/templates.test.ts`, `ProjectsScreen.test.tsx` and `RoadmapScreen.test.tsx`, which need uninstalled packages, never ran), and a check in a browser. Ran in stand-in runners: `data/template.test.ts` (16 pass); `TemplatePicker.test.tsx` and `SprintsScreen.test.tsx` under Jest with stubbed icons and an open-aware stand-in for Radix Dialog (11 pass); a parse, import and undefined-name check of every changed `.ts/.tsx`; and a compile of `TemplatePicker.scss` with sass.

To verify and merge:

```sh
cd frontend && npm install && npx tsc --noEmit && npm run lint && npm test
```

Then run the app against a backend and check, at 375px and desktop, in light and dark: /projects, /roadmap and /sprints each show "From template"; the dialog lists the templates, scrolls on a short phone, and creates the item; the new project, milestones and initiatives (Roadmap, both tabs) or sprint and its tasks appear without a reload; a failing request (stop the backend) shows the error in the dialog. Merge hazards: this edits the headers of `ProjectsScreen.tsx`, `SprintsScreen.tsx` and `RoadmapScreen.tsx` and their tests, widens one type in `api/initiatives.ts`, edits one line in `docs/features/projects.md` that `backlog/project-types` also edits, and adds a row to `docs/features/README.md` (which is also cleaned of the conflict markers main had committed in it).

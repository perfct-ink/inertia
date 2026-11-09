---
branch: backlog/project-types
status: incomplete
priority: p2
depends_on: []
---
# Project types

## Objective

**Project types**: software, music release, video, event, marketing campaign, writing/content, personal, and blank

## Current state

Not present. Folders have `kind` (`folder`/`project`) only.

## Requirements / notes

A type sets the starting template, the default task lists and fields, and the features the project uses (ties to `choose-which-features-a-project-uses.md` and `docs/features/projects.md`). Users can save their own project as a type.

### Merged: project templates (Alex, 2026-11-09 groom)

`project-and-item-templates.md` (p2, "Board / item templates: project, roadmap and sprint templates") was merged into this task. A saved project type and a project template are the same thing: saving a project as a type is how you make a project template. Roadmap and sprint templates from that task are not covered yet; a later task can add them if needed.

## Context

Section "Requirement docs, project types, releases and recurring work" of the retired shared backlog.

Requested by Alex on 2026-10-18: write product requirement documents that turn into tasks and stay in sync both ways; support every kind of project, not only software (Alex often writes a document per song and tracks the work for a release: a song, an album, a music video); tasks can be recurring or ongoing, and those should notify the person and ask for an update.

### How other tools handle this (light research, 2026-10-18)

- **Doc to tasks, both ways**: Jira + Confluence (create issues from requirement text; issue status shows inline in the page), Notion (a page embeds a synced task database), Linear (project documents next to the project's issues), Quip (live checklists). The common pattern is that the document holds a live reference to the task, so status shown in the doc is always the task's real status.
- **Project types as templates**: Monday, Asana and ClickUp start projects from templates per kind of work (software launch, marketing campaign, event, content calendar). A template is a document skeleton plus default task lists, fields and views.
- **Music releases**: release plans are usually worked back from the release date: writing, recording, mixing and mastering, artwork, credits and metadata (ISRC per track, UPC per release), distributor upload, streaming-editorial pitch (Spotify for Artists asks for at least 7 days before release, and earlier is better), music video, promo and social posts, then post-release follow-up. One song can belong to several releases (single, then album).
- **Recurring and ongoing work**: Asana and Todoist repeat a task on a schedule (every week, the 1st of the month, N days after completion). Basecamp's automatic check-ins ask a person a question on a schedule ("What did you work on this week?"); Monday's update requests ask an owner for a status. An ongoing task never completes; it is checked in on.

## Acceptance criteria

- Project types works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Status after Alex's 2026-11-09 groom (project templates merged in): a saved project type is a project template, and both halves work on this branch.
- **Save a project as a type** ("Save as type..." in the project dropdown and on each project card) makes a reusable template: `POST /api/v1/project_types` snapshots the project with `ProjectTemplate.snapshot`. **Creating a project from a type** works for the eight built-in types (the web app sends the template) and for saved types (the server uses the stored template), in one transaction through `POST /api/v1/folders`.
- **The rule for what a template copies** (feature doc "What a saved type carries", and the header of `backend/app/services/project_template.rb`): the project's structure and starting text, never the people or the work done in it. Carried: subfolders and where items sit, documents and sheets with their text, Collection names and fields, and the titles of top-level tasks. Never carried: people (owner, members, assignees, watchers, document authors), dates, statuses, Collection records, uploaded files, files and images embedded in documents (each becomes a paragraph), comments, subtasks and planning records. This groom added subfolders and the file stripping.
- **Features** (the type sets the starting features of the project) are still deferred, by design: the per-project features setting is not on `main`, and features are per project only now. Filed as `project-types-set-features.md`, which now depends only on `choose-which-features-a-project-uses.md`. Roadmap and sprint templates are not covered (the groom said so). A saved type has no rename or edit yet: `project-types-edit-saved.md`.

Decision for Alex: a template now keeps the folder structure (it used to flatten subfolders into the project). If a template should start flat, change `ProjectTemplate.snapshot`.

Ran here: `ruby -c` on every changed Ruby file; the pure `ProjectTemplate.clean` cases (folders, placement, limits, files replaced) with `ruby`; the static checks, the pure data tests and the component tests in the Jest stand-in (`projectType`, `documentTemplate`, `projectTypes` api, `NewProjectDialog`, `SaveProjectTypeDialog`, `ProjectDetails`, `ProjectNav`, `ProjectsScreen`, `useNewDocument`).

Not run (no network, node_modules, database or browser here): `ProjectTemplate.snapshot` and `apply` against a database, every Minitest file, the migrations and the `schema.rb` diff, `npm run lint`, `tsc -b`, the project's own Jest run, and the dialogs in a browser. To verify:

```bash
cd backend && rails db:migrate && git diff db/schema.rb   # only the project_type column and the project_types table should differ
cd backend && rails test test/services/project_template_test.rb test/controllers/project_types_controller_test.rb test/controllers/folder_project_types_test.rb test/models/project_type_test.rb test/models/folder_test.rb test/services/space_transfer_test.rb
cd backend && rails test && make lint-backend
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: on a project with a subfolder, a spreadsheet, a Collection and a few tasks, press Save as type (the dialog says it makes a reusable template), open New project, pick the saved type (its card reads "1 folder, ...") and create. The new project has the subfolder, documents, Collection fields (no records) and tasks in the backlog, with no owner and no assignees. Also check the built-in types, deleting a saved type, and the card's Type select.

Delete this file when the branch is merged.

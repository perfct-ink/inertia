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
Built on this branch (see `docs/features/project_types.md`): the eight types with starting documents, Collections and tasks, a New project dialog with a type picker, saving a project as a type, deleting a saved type, a Type select on the project card, and the project type through copy and move between Spaces. The decisions made for Alex are in the feature doc ("Decisions"): the type is a string key on `folders.project_type`, built-in templates live in the web app, the "features a type turns on" part is deferred until the per-project and per-Space features settings exist (so it does not collide with their columns), and a type does not create Space-wide task fields.

Ran here: `ruby -c` on every changed Ruby file, the pure `ProjectTemplate.clean` cases with `ruby -e`, the data tests (`projectType`, `documentTemplate`), and the component tests in the Jest stand-in.

Not run (no network, node_modules, database or browser here). To verify:

```bash
cd backend && rails db:migrate && git diff db/schema.rb   # only the project_type column and the project_types table should differ
cd backend && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then look at the Projects page and the sidebar in a browser at 375px and desktop, light and dark: the New project dialog (type cards, saved types, delete), Save as type, and the card's Type select.

Left for later, filed as their own tasks: `project-types-set-features.md` (apply a type's features once the per-project and per-Space features settings land) and `project-types-edit-saved.md` (rename and update a saved type). Not filed: a type column or filter on the Portfolio. Delete this file when the branch is merged.

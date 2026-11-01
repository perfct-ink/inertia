---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Save a roadmap or sprint as a template

## Objective

Let a member save an existing roadmap (its milestones and initiatives) or a sprint (its tasks) as a template for their Space, and start new ones from it next to the built-in templates.

## Current state

`docs/features/item_templates.md`: the project, roadmap and sprint templates are built in (`frontend/src/data/template.ts`) and cannot be changed or added to. Saving a project as a project type is covered by `project-types.md`, so this task is for roadmaps and sprints (and should reuse whatever model the project type work adds if it lands first).

## Requirements / notes

- A Space-scoped template record (kind, name, JSON of what it creates with dates stored as offsets from the start date), with an API under `api/v1` scoped to the current Space and its member role.
- A "Save as template" action on a sprint card and on the roadmap, and the saved templates listed in `TemplatePicker` after the built-in ones, with delete.
- Dates are stored as offsets so the template can start on any day.
- Open question for Alex: are saved templates visible to the whole Space or only to their creator? Build the Space-wide version, as Spaces are the sharing unit.

## Acceptance criteria

- A member can save a sprint or roadmap as a template, start a new one from it with a new start date, and delete it.
- Failed API calls show an error to the user.
- Backend and frontend tests cover it; `docs/features/item_templates.md` is updated and this file is removed.

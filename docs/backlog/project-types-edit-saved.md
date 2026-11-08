---
priority: p3
depends_on: [project-types.md]
components: [frontend, backend]
---
# Edit saved project types

## Objective

Rename a saved project type, change its description and icon, and replace what it starts a project with from a project's current state.

## Current state

`docs/features/project_types.md`: a project can be saved as a type and a saved type can be deleted. There is no way to edit one: to fix a name, save the project again under a new name and delete the old type.

## Requirements / notes

- A "Manage project types" list (from the New project dialog) with rename, description, icon, "Update from a project" (re-take the snapshot from a chosen project) and delete.
- `PATCH /api/v1/project_types/:id` with the same validations as create; the key (`custom_<id>`) never changes, so projects keep their label.
- Works at phone width: a dialog with tap-sized controls.

## Acceptance criteria

- A member can rename a saved type and the New project dialog and every project card show the new name.
- Updating from a project replaces the type's starting documents, Collections and tasks, and leaves projects already made from it as they are.
- Failed API calls show an error to the user.
- Tests cover the API and the dialog; `docs/features/project_types.md` is updated and this file is removed.

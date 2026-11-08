---
priority: p1
depends_on: [choose-which-features-a-project-uses.md, choose-which-features-a-space-uses.md]
components: [frontend, backend]
---
# Project types set the features a project uses

## Objective

A project type also says which features (pages) a new project of that type uses, so a music release shows the pages it needs and a software project shows others.

## Current state

`docs/features/project_types.md`: a type starts a project with documents, Collections and tasks and labels it. It does not set features, because the per-project and per-Space features settings are separate backlog tasks (`choose-which-features-a-project-uses.md`, `choose-which-features-a-space-uses.md`) and a second column here would collide with them.

## Requirements / notes

- Add a `features` list to the project template (`ProjectTemplate` in `backend/app/services/project_template.rb`, `ProjectTemplate` in `frontend/src/data/projectType.ts`) using the same feature keys as the project features setting.
- Creating a project from a type sets the project's features to the type's list (a type with none leaves every feature on). A project can only turn on what its Space uses.
- Choose each built-in type's starting features and record them in the feature doc.
- "Save as type" copies the project's current features into the saved type.

## Acceptance criteria

- A new project of a type starts with that type's features on and the rest off; a type with no list leaves everything on.
- Saving a project as a type keeps its features.
- Failed API calls show an error to the user.
- Tests cover the template, the create call and the picker; `docs/features/project_types.md` is updated and this file is removed.

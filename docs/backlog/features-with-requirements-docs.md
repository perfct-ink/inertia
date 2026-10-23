---
priority: p0
depends_on: [requirements-template, task-line-two-way-sync]
components: [backend, frontend]
---
# Features with requirements docs

## Objective

Alex (2026-10-22): "In a space, the user should be able to create features, which are like epics. Every feature requires a requirements document. Tasks can be written in the requirements document. The user should be able to see the requirements and check off what's complete. The user should be able to collapse down the requirements to just tasks."

This task is the user-facing flow that ties the feature backlog together: create a feature in a Space, land in its requirements document, write tasks there, check them off, and fold the doc down to just its tasks.

## Requirements

1. **Create a feature from a Space.** A "New feature" action in the Space (sidebar new-item menu and the feature folder) asks for a name and creates the feature. A feature is an epic (see Decision), so it sits in the planning hierarchy under an initiative or milestone.
2. **A requirements document is required.** Creating a feature always creates its requirements document from the requirements template (`requirements-template.md`) in the same request; there is no feature without one. The server rejects a feature without a document, and the document can't be deleted or archived while the feature exists (archive or delete the feature instead, which takes the doc with it).
3. **Tasks are written in the doc.** Checklist lines in the requirements doc become Space tasks linked to the feature (the existing task lines in `docs/features/document_task_lines.md`, with `tasks.document_id` pointing at the feature's doc). No separate "add task" form is needed for the feature.
4. **See and check off.** Opening a feature opens its requirements doc with a header showing the feature's name, status and progress (done tasks / all tasks, `feature-status-and-owner.md`). Each task line has a real checkbox: checking it sets the task to `done`, unchecking sets it back, and status changes made elsewhere update the box (from `task-line-two-way-sync.md`). Progress updates without a reload.
5. **Collapse to just tasks.** A toggle on the feature folds the doc down to its task lines (headings kept as group labels, so tasks still read under the section they came from) and expands back to the full requirements. Reuse the existing "Tasks only" toggle (`document-page--tasks_only` in `view/document/DocumentScreen.scss`) rather than building a second one. Remember the choice per user per feature (local storage is fine) so a feature reopens the way it was left. Optionally fold per section too (a disclosure on each heading).
6. **Design principles** (`docs/rules/product.md`): works at 375px with touch-sized checkboxes and toggle; the collapse animates in 150ms or less and doesn't shift the checkbox under the cursor; the toggle and checkboxes use the shared `@/components/ui` controls; header hides progress when the feature has no tasks yet.

## Decision (Alex, 2026-10-23)

A feature is an **epic with a required requirements document**. Build it on the existing `Epic` model: add a required `document_id` to `epics` (backfill a template doc for existing epics in the migration), and call them Features in the UI the way workspaces are Spaces and tables are Collections (code, API and DB keep `epic`). Features reuse the epic rollups, roadmap, Gantt and planning hierarchy (initiative, milestone). Tasks written in the doc get `epic_id` set to the feature as well as `document_id`, so existing epic progress counts them.

This replaces the folder-flag design in `feature-folder-type.md` and the `parent_feature` default in `feature-hierarchy.md`; revisit those before building them.

## Current state (checked 2026-10-22)

- Built: task lines in documents create tasks with `document_id`; a "Tasks only" toggle folds a doc to headings and task lists (`DocumentScreen.tsx`, not saved between visits).
- Not built: features themselves, the required requirements doc, a checkbox on task lines (lines show a status dot only), and a progress header.

## Acceptance criteria

- A Space member can create a feature and is taken straight to its new requirements document, built from the template.
- A feature can't exist without its requirements document (enforced by the API, covered by a model and request test).
- Checklist lines written in that doc become tasks of the feature; checking a line marks the task done and the feature's progress updates.
- The collapse toggle shows only the tasks (under their headings) and restores the full doc; the choice is remembered for that feature.
- Works in light and dark mode and at mobile width. Failed API calls show an error.
- Tests cover the new behaviour; `docs/features/` is updated (a `features.md` doc, the epic docs that mention Features, and `document_task_lines.md` for the checkbox), and this file is removed.

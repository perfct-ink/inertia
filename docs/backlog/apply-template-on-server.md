---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Apply a template in one request

## Objective

Create everything a template adds in a single server request and one database transaction, so a failure leaves nothing behind.

## Current state

`docs/features/item_templates.md`: `frontend/src/api/templates.ts` sends one request per record (a project, its files and tasks; milestones and their initiatives; a sprint and its tasks). If one fails, the earlier records stay, and the dialog reports how many were created.

## Requirements / notes

- A Space-scoped endpoint (for example `POST /api/v1/templates/apply`) that takes the same plan the frontend builds (`planTemplate` in `frontend/src/data/template.ts`), validates it with the models' own rules, creates it in a transaction, and returns what it made.
- Role and Space scoping as in the neighbouring controllers (`WorkspaceScoped`).
- The client sends the plan in one request and drops the sequencing and partial-failure message.

## Acceptance criteria

- A plan that fails validation creates nothing and shows the error.
- Backend and frontend tests cover success and failure; `docs/features/item_templates.md` is updated and this file is removed.

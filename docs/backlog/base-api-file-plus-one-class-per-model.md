---
priority: p1
depends_on: []
components: [backend]
branch: backlog/base-api-file-plus-one-class-per-model
---
# Base API file plus one class per model

## Objective

Base API file plus one class per model

## Requirements / notes

`src/api/` has one module per model but no shared base class.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Base API file plus one class per model works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented with a base class and a class per model; see `docs/features/api_layer.md`. Not run (no network or `node_modules`): `cd frontend && npm install && npm run lint && npx tsc -b && npm test` (the generics in `api/base.ts` are the part most likely to need a type fix), then open the Tasks, Epics, Folder, Documents, OKRs, Projects and Space members screens and check that data still loads, saves and refetches. Then remove this file and merge. Merge hazard: branches that edit `api/workspace.ts`, `api/workspaces.ts` or `api/objectives.ts` conflict; resolve by moving their hooks into the model's class file.

---
priority: p3
depends_on: []
components: [frontend]
branch: backlog/whiteboard-monday-workcanvas
status: incomplete
---
# Whiteboard (Monday WorkCanvas)

## Objective

Whiteboard (Monday WorkCanvas)

## Current state

None. P3.

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Whiteboard (Monday WorkCanvas) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not built: the spec is "Whiteboard (Monday WorkCanvas)" and "Current state: None. P3", with no requirements. A whiteboard is a large feature (an infinite canvas with shapes, text, connectors and images, real-time collaboration, and a way to link it to tasks and documents), and the choices that shape it are Alex's: what it is for (diagrams, planning boards, sketches), whether it is a new document type (`doc_type`) or a view, whether it collaborates in real time like documents (the collaboration server is Yjs/Hocuspocus, which fits), and whether to build on a library (tldraw or Excalidraw would be a new dependency that needs the "no new infrastructure without asking" call in `docs/rules/conventions.md`) or draw it by hand with SVG.

When scoped, a conservative first slice is a new document type with a pannable canvas and sticky notes and text blocks stored as JSON in `documents.content`, saved through the existing document endpoints, with real-time sync a second step. Needs `docs/features/` and tests like any document type.

---
priority: p0
depends_on: [ai-worker-agent-access]
components: [backend, collab-server, frontend]
---
# AI worker: the app updates live as the agent edits

## Objective
When an agent changes a document, task or collection, everyone with it open sees the change right away, without reloading (Alex, 2026-10-19).

## Today
- Documents are live between people through `collab-server/` (Hocuspocus/Yjs). But it keeps the open document in memory and writes it back to Rails on a debounce, so a change made through the Rails API while someone has the document open is overwritten by the next save.
- Task lists and boards only refresh when React Query refetches. Action Cable is set up but nothing broadcasts (`docs/services.md`).

## Requirements
- Agent document edits go through the collab server (applied to the live Y.Doc), so open editors show them and nothing is lost. When no one has the document open, write to Rails as today.
- Broadcast task, collection and run changes over Action Cable (needs a real adapter in production, such as Redis), and have the frontend update open lists, boards and task lines from those events.
- Show agent edits as such: the agent's name and cursor/highlight while it edits, and an activity entry afterwards.
- While a run is active, the run's status shows on the items it covers.

## Acceptance criteria
- With a document open in the browser, an agent edit through MCP appears within a couple of seconds and survives the next save.
- An agent ticking a task updates the open board and the document's task line without a reload.
- Tests cover the broadcast and the no-overwrite case; feature docs are updated and this file is removed.

---
priority: p1
depends_on: []
components: [frontend, backend, collab-server]
branch: backlog/offline-mode
status: incomplete
---
# Work offline: read cached documents, create new ones, sync on reconnect

## Objective

Alex (2026-11-10): "If internet is offline, show it at the top left with an icon. Do your best with no internet. I should be able to create new documents, and read cached documents. Once online, save the new documents and update the existing ones as best as possible. We'll have to deal with conflicts."

## Requirements

1. **Offline indicator** at the top left with an icon. *Built* (see Progress).
2. **Read cached documents.** Documents opened before (and the Space's folder tree) open without a network. Cache them on the device (IndexedDB), keyed by Space and user, and clear the cache on sign-out.
3. **Create documents offline.** A new document gets a temporary local id, appears in the sidebar under its folder, and is editable. On reconnect it is created on the server (the temporary id is swapped for the real one, open tabs follow it) and its content saved. Failures show an error and keep the document locally.
4. **Edit cached documents offline** and save them on reconnect as best as possible. Documents are live-edited through the collab server (Hocuspocus/Yjs); Yjs merges concurrent edits, so keep the Y.Doc state locally (e.g. `y-indexeddb`) and let it sync when the provider reconnects.
5. **Conflicts.** Yjs merges document text without a conflict. Things it can't merge need a rule shown to the person: a document deleted or moved by someone else while it was edited offline, a folder deleted under a new document, and any other write that is refused on replay. Never discard offline work silently; keep it and say what happened.
6. Tasks, events and other data are read-only offline for now (show a clear message instead of a failed request); say so in the feature doc.
7. Works on phones (design principles): the indicator is visible at 375px.

## Open questions for Alex

- Offline edits of existing documents when the document changed on the server meanwhile: merge silently (Yjs) or show a "changed while you were away" notice with the choice to keep both versions?
- How much to cache (every document, or the last N opened)?

## Acceptance criteria

- Offline, the indicator shows; a document opened earlier opens; a new document can be made and typed in.
- Back online, the new document exists on the server with its text, and edits made offline reach existing documents.
- A conflict is shown to the person, with their offline text kept.
- Tests cover the cache, the temporary-id swap and a conflict; `docs/features/offline_mode.md` is updated and this file removed.

## Progress

Built on this branch: the offline indicator only (`components/OfflineIndicator.tsx`, `hooks/useOnline.ts`, mounted in `App.tsx`), with tests. Requirements 2 to 7 are not built. Not checked in a browser (go offline in DevTools > Network; check the top left at 375px and desktop, light and dark).

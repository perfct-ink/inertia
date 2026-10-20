---
branch: backlog/rebind-editor-shortcuts-to-apple-notes-map
priority: p1
depends_on: []
components: [frontend, backend]
---
# Rebind the editor to the map above

## Objective

**Rebind the editor to the map above**, Apple Notes first

## Requirements / notes

One shortcut table in code that the editor, the `⌘/` cheat sheet and `docs/keyboard-shortcuts.md` all read, so they can't drift.

## Context

Section "Document shortcuts match Apple Notes and Google Docs" of the retired shared backlog.

Requested by Alex on 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins.

**Today** the editor uses TipTap's default bindings (see `docs/keyboard-shortcuts.md`). Bold, italic, underline, undo/redo and `⌘⌥1`–`6` headings already match Google Docs. The rest don't match either app.

Proposed map (Mac keys; `⌘` is `Ctrl` elsewhere). Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building.

The full proposed keystroke map (Apple Notes vs Google Docs vs the choice for Inertia) is in `docs/keyboard-shortcuts.md`, section "Planned bindings".

## Acceptance criteria

- Rebind the editor to the map above works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch for the bindings that do not need other work (see the feature doc for the rest). The table-and-doc test passes in a stand-in runner; no keystroke was tried. Several combinations are claimed by browsers (`⌘⇧T`, `⌘⇧B`) so the product call is whether to keep them. To verify: `cd frontend && npm install && npm run lint && npm test`, then press each shortcut in the document editor in a browser and in the Electron app. Leave this file on `main` until the remaining bindings ship, or split the done part out.

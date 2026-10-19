---
priority: p1
depends_on: [rebind-editor-shortcuts-to-apple-notes-map]
components: [macos, frontend]
---
# Same bindings in the Mac app, plus Format menu items showing each shortcut

## Objective

Same bindings in the Mac app, plus Format menu items showing each shortcut

## Requirements / notes

The Mac app loads the web editor, so the bindings carry over. Menu items let people find them.

## Context

Section "Document shortcuts match Apple Notes and Google Docs" of the retired shared backlog.

Requested by Alex on 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins.

**Today** the editor uses TipTap's default bindings (see `docs/keyboard-shortcuts.md`). Bold, italic, underline, undo/redo and `⌘⌥1`–`6` headings already match Google Docs. The rest don't match either app.

Proposed map (Mac keys; `⌘` is `Ctrl` elsewhere). Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building.

The full proposed keystroke map (Apple Notes vs Google Docs vs the choice for Inertia) is in `docs/keyboard-shortcuts.md`, section "Planned bindings".

## Acceptance criteria

- Same bindings in the Mac app, plus Format menu items showing each shortcut works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

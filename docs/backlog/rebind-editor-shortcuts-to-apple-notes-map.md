---
priority: p1
depends_on: []
components: [frontend, backend]
---
# Rebind the editor to the map above

## Objective

**Rebind the editor to the map above**, Apple Notes first

## Requirements / notes

One shortcut table in code that the editor, the `⌘/` cheat sheet and `docs/keyboard-shortcuts.md` all read, so they can't drift.

### Merged in (Alex, 2026-11-09 groom)

The editor shortcut tasks are one task. This file now also covers:

- **Clashes with global shortcuts** (was `editor-vs-global-shortcut-clashes.md`): `⌘K` (quick-add) and `⌘E` (new event; also inline code today). Default: inside the document editor the formatting meaning wins (`⌘K` = link); quick-add moves to another key or works from outside the editor only.
- **Windows/Linux** (was `windows-linux-editor-shortcuts.md`): `Ctrl` for `⌘`; check each against browser-reserved keys (e.g. `Ctrl+Shift+N`, `Ctrl+Shift+T`).
- **Mac app Format menu** (was `mac-app-format-menu-shortcuts.md`): the Mac app loads the web editor, so the bindings carry over; add Format menu items showing each shortcut so people can find them.
- **Dashed list key** for `dashed-list-block.md`, which ships first with a toolbar button.

Kept separate: `paragraph-style-shortcuts.md`, because it is already built on its own branch (`backlog/paragraph-style-shortcuts`) and only waits on checks; merging its file would orphan that branch. `docs/keyboard-shortcuts.md` still lists the three merged files; update that list when this task merges.

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

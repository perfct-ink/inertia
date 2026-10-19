---
priority: p1
depends_on: [custom-styles-are-per-user-and-global]
components: [frontend, backend]
---
# Assign a paragraph style to a keystroke

## Objective

**Assign a paragraph style to a keystroke** (Alex, 2026-10-18): any built-in or custom paragraph style (`built-in-paragraph-styles.md` to `paragraph-style-shortcuts.md`) can get a shortcut, set by the user

## Requirements / notes

Default: per-user, saved with the user's styles, editable from the style's menu and the `⌘/` sheet. Warn on clash with a built-in key and let the user's choice win inside the editor. Suggested free range: `⌃⌘1`–`⌃⌘9`.

## Context

Section "Document shortcuts match Apple Notes and Google Docs" of the retired shared backlog.

Requested by Alex on 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins.

**Today** the editor uses TipTap's default bindings (see `docs/keyboard-shortcuts.md`). Bold, italic, underline, undo/redo and `⌘⌥1`–`6` headings already match Google Docs. The rest don't match either app.

Proposed map (Mac keys; `⌘` is `Ctrl` elsewhere). Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building.

The full proposed keystroke map (Apple Notes vs Google Docs vs the choice for Inertia) is in `docs/keyboard-shortcuts.md`, section "Planned bindings".

## Acceptance criteria

- Assign a paragraph style to a keystroke works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

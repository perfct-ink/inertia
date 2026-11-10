---
priority: p1
depends_on: [custom-paragraph-styles]
components: [frontend, backend]
branch: backlog/paragraph-style-keystrokes
status: incomplete
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

## Unverified

Built: per-person keystrokes for any built-in or custom style (backend `ParagraphStyleShortcut`, migration `20261110130001`, `GET/PUT/DELETE /api/v1/paragraph_style_shortcuts`; frontend dialog, editor binding that wins over the editor's keys, clash note, Style menu hints and `⌘/` sheet rows), with tests and `docs/features/paragraph_styles.md` updated. Frontend Jest (all suites), `tsc` and eslint passed.

Not run here (no Rails, Docker or Swift in this session): `rails db:migrate` and a diff of `backend/db/schema.rb` (it was edited by hand to match the migration), `rails test` (new model and controller tests), `swift test --package-path macos`, and a browser check at 375px and desktop in light and dark (record a chord in Style shortcuts…, press it in a document, check a clash with `⌘B`). To finish: run those, fix anything they find, then delete this file.

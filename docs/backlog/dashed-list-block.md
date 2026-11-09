---
branch: backlog/dashed-list-block
status: incomplete
priority: p1
depends_on: []
components: [frontend]
---
# Dashed list block

## Objective

Dashed list block

## Requirements / notes

Notes' third list style; not in the editor today.

**Build it now** (Alex, 2026-11-09 groom): no need to wait for the shortcut rework. Ship the dashed list with a toolbar button (and the list menu, if any); its keyboard shortcut comes with `rebind-editor-shortcuts-to-apple-notes-map.md`.

## Context

Section "Document shortcuts match Apple Notes and Google Docs" of the retired shared backlog.

Requested by Alex on 2026-10-18: document formatting uses the same keystrokes as Google Docs and Apple Notes; where they conflict, Apple Notes wins.

**Today** the editor uses TipTap's default bindings (see `docs/keyboard-shortcuts.md`). Bold, italic, underline, undo/redo and `⌘⌥1`–`6` headings already match Google Docs. The rest don't match either app.

Proposed map (Mac keys; `⌘` is `Ctrl` elsewhere). Both apps' bindings are from training knowledge (mid-2026) and need checking against each app's menus before building.

The full proposed keystroke map (Apple Notes vs Google Docs vs the choice for Inertia) is in `docs/keyboard-shortcuts.md`, section "Planned bindings".

## Acceptance criteria

- Dashed list block works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built 2026-11-09 on branch `backlog/dashed-list-block` (see `docs/features/dashed_list.md`).

**Done:** a `listStyle` attribute (`bullet` default, `dashed`) on the bullet list (`frontend/src/extensions/DashedList.ts`, mirrored in `collab-server/src/schema.ts`), a "Dashed list" toolbar button, style-aware Bullet and Dashed toggles, Tab keeping the style, the typing rule `– ` (en dash, space), the CSS dash, and tests. The editor has no list menu, so the button is the only control. The key is deliberately not bound: `LIST_SHORTCUTS` in `DashedList.ts` is the single place the rebind task sets it.

**Decisions for Alex:** the data shape is a bullet-list attribute rather than a new node, so old tabs and servers degrade to plain bullets and Tab/Shift+Tab, Quip import and a Markdown export (`- `) keep working. Typing `- ` still makes a normal bullet list (not hijacked); the typing trigger for dashed is an en or em dash plus a space, change or drop it in `DashedList.ts` (`DASHED_INPUT`). The collab server must be deployed with the frontend or dashed lists are saved as plain bullets.

**Checks run (offline stand-in):** static checks (parse, imports, sass compile), `frontend/src/data/listStyle.test.ts`, `frontend/src/components/DashedListButton.test.tsx`.

**Not run (no network, node_modules or TipTap here):** `frontend/src/extensions/DashedList.test.ts` (real TipTap editor), the collab-server schema test, ESLint, Stylelint, `tsc` (the TipTap command, `wrappingInputRule` `joinPredicate` and `Commands` augmentation typings were written from memory of TipTap 2.27), and everything in a browser.

**To verify:**

```sh
cd frontend && npm install && npm run lint && npx tsc -b && npm test
cd collab-server && npm install && npm test
make test
```

Then in a browser (`make up`), light and dark, desktop and 375px: click the Dashed list button on a paragraph, a bullet list and a numbered list; indent with Tab (nested items stay dashed); type `– ` and `- ` at a line start; check the dash lines up with the text, the button tooltip shows and the toolbar scrolls sideways; open the same document in two windows and check the style syncs and survives a reload (this needs the collab server rebuilt from this branch).

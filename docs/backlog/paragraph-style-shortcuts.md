---
priority: p1
depends_on: [style-picker]
components: [frontend]
branch: backlog/paragraph-style-shortcuts
---
# Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1)

## Objective

Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1)

## Context

Section "Paragraph styles in documents" of the retired shared backlog.

Requested by Alex on 2026-10-13: documents have a common set of paragraph styles, and you can create your own style, which is added to your paragraph style list everywhere, for your user only.

Today: the editor (`DocumentScreen.tsx`, Tiptap) has fixed node types only (paragraph, headings, lists, task lists, code block, tables, images). There is no style picker, no named styles, and nothing style-related stored on `users`.

## Acceptance criteria

- Keyboard shortcuts for styles (e.g. Cmd+Opt+1 for Heading 1) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Branch `backlog/paragraph-style-shortcuts`, not merged. Done: `⌘⌥` plus a digit for Title `⌘⌥7`, Subtitle `⌘⌥8`, Body `⌘⌥0` and Quote `⌘⌥9` (Heading 1 to 3 keep TipTap's `⌘⌥1` to `⌘⌥3`), from one table in `frontend/src/data/paragraphStyleShortcut.ts`, bound by `extensions/ParagraphStyleShortcuts.ts`; documented in `docs/keyboard-shortcuts.md` (including clashes with `backlog/rebind-editor-shortcuts-to-apple-notes-map`) and `docs/features/paragraph_styles.md`. No API calls, so no error display needed.

Decisions for Alex: Caption and Monospace have no default key (no precedent for Caption; `⌘⇧M` is Apple Notes' Monospaced style but the rebind map gives it to the code block). Showing the keys in the style menu and the `⌘/` sheet is not done, to avoid editing the picker and `Sidebar.tsx` that other branches change.

Merging: if `backlog/rebind-editor-shortcuts-to-apple-notes-map` merges too, its `normalText` entry (`⌘⌥0`) duplicates Body here; keep one. If the custom styles task changes `ParagraphStylePicker.tsx`, make its `apply` call `applyParagraphStyle` from `util/paragraphStyleCommand.ts`. Not run (no network, node_modules or database): `npm run lint`, `tsc -b`, the full Jest suite, a browser check of each key in Safari, Chrome and Firefox (do `⌘⌥7`, `⌘⌥8`, `⌘⌥9` reach the page?), and with a selection across several blocks. To verify: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then open a document and press each key.

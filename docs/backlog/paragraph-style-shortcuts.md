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

Branch `backlog/paragraph-style-shortcuts`, not merged because lint, the type-check and a browser could not run on the machine that finished it.

Done, with Alex's decisions (2026-11-06): Heading 1 to 6 are `⌘⌥1` to `⌘⌥6` (TipTap's own keys; the editor now allows level 6); Title `⌘⌥7`, Subtitle `⌘⌥8`, Quote `⌘⌥9`, Body `⌘⌥0`; Monospace `⌘⇧M`; Caption has no key yet. One table in `frontend/src/data/paragraphStyleShortcut.ts` is bound by `extensions/ParagraphStyleShortcuts.ts`, shown beside each style in the Style menu (the shared `Select` takes an optional `data-hint` on an option) and listed in the `⌘/` sheet (which now scrolls on a short screen). Documented in `docs/keyboard-shortcuts.md` and `docs/features/paragraph_styles.md`. No API calls.

Ran: the static checker, the pure data and command tests, and `ParagraphStylePicker.test.tsx` and the new hint test in `Select.test.tsx` in a Jest stand-in (they passed). `Select.test.tsx`'s two older tests fail in the stand-in on main too (they look the select up by its label), so they are unverified.

Not run, to do before merging: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then in a browser open a document and press each key in Safari, Chrome and Firefox (do `⌘⌥7`, `⌘⌥8`, `⌘⌥9` and `⌘⇧M` reach the page? In Chrome on a Mac `⌘⇧M` is the browser's profile menu, so it may not), with a selection across several blocks, and check the Style menu and the `⌘/` sheet at 375px and in dark mode.

Merging: `backlog/rebind-editor-shortcuts-to-apple-notes-map` binds `⌘⇧M` to the code block and `⌘⌥0` to "Normal text"; the code block needs another key and one of the two `⌘⌥0` bindings can go. The style picker now calls `applyParagraphStyle` too (one implementation for the menu and the keys); `backlog/create-a-custom-style` also edits `ParagraphStylePicker.tsx`, so keep that call when merging. The `⌘/` sheet is in `Sidebar.tsx`, which several branches touch.

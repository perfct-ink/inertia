---
priority: p2
depends_on: [rebind-editor-shortcuts-to-apple-notes-map, paragraph-style-shortcuts]
components: [frontend]
---
# Code blocks with a language and syntax highlighting

## Objective

A code block in a document has a language, and its text is formatted (highlighted) for that language. The Monospace paragraph style and the code block are one thing, so there is one way to write code in a document.

## Requirements / notes

- **One thing, not two** (Alex, 2026-11-09): the Monospace paragraph style and the code block are the same. Choosing Monospace in the style picker makes a code block, and a code block shows as Monospace in the picker. They share one shortcut, `⌘⇧M` (the key Notes uses for Monospaced and the one `paragraph-style-shortcuts` gives Monospace); the temporary `⌘⌥⇧C` that `rebind-editor-shortcuts-to-apple-notes-map` used for the code block goes away.
- **Format by language** (Alex, 2026-11-09): a code block has a language, picked from a small menu on the block (plain text by default), and its text is highlighted for that language. Start with the common ones (JavaScript, TypeScript, Ruby, Python, Swift, SQL, JSON, YAML, HTML, CSS, shell, Markdown) and keep the list in a data file so adding one is a one-line change.
- The language is saved with the block, kept when the document is copied, exported or shared, and shown the same to everyone editing it live (the collab schema in `collab-server/src/schema.ts` carries the attribute; deploy the collab server with the frontend).
- Highlighting follows the theme in light and dark mode and meets contrast (AA, 4.5:1) in both.
- Existing Monospace paragraphs and code blocks keep their text; they open as code blocks in plain text.
- The language menu is a shared `@/components/ui` select, keyboard operable, touch-sized at 375px, and does not shift the block when it opens.

## Context

Asked for by Alex on 2026-11-09 while answering questions about `rebind-editor-shortcuts-to-apple-notes-map`. A highlighting library is a new dependency, which is Alex's call: build the first version with the small pure tokenizer or the highlighter the editor already ships if there is one, and record the choice.

## Acceptance criteria

- Monospace and code block are the same in the editor, the style picker and the shortcut sheet, on `⌘⇧M`.
- A code block's language is chosen from a menu, saved, and shown with highlighting in light and dark mode, live for other editors.
- Failed API calls show an error to the user.
- Tests cover the language list, the migration of existing Monospace text and the shortcut; a feature doc in `docs/features/` is written (or `paragraph_styles.md` and `editor_shortcuts.md` updated) and this file is removed.

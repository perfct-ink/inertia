## Product

Inertia is an app for documents, spreadsheets, and tasks.

### Documents
Documents have common formatting much like Quip or Google Docs.

#### Document Templates
Documents can have templates such as Product Requirements Documents, etc.

### Spreadsheets
Excel-like spreadsheets with formulas.

### Collections
A collection document is one similar to a database table, where a name is set and fields are set. Each field has a type. The type has validations set with it. Users see these as **Collections** (never "Tables"); code, API and DB keep `table` (`doc_type: table`, `TableField`, `TableCell`).

### Tasks
Tasks can be rolled up from whats inside documents. Tasks are created in documents by just creating a checklist or a checkable item. Epics can be created from the paragraph headings that tasks are inside of. For example, if I am working on a feature for a tool called Messages. In a Messages document, I might have a paragraph about a feature called "Background images", and a checkbox for the tasks to complete that feature. This makes each checkbox a task automatically.

### Spaces (code: workspaces)
Users see workspaces as **Spaces**. Use "Space" in every label, message, page title and doc meant for users. Code, API paths, the `X-Workspace-Id` header and the database keep the name `workspace`. Rails model names are translated in `backend/config/locales/en.yml`. See `docs/spaces.md`.

### Design principles

From Alex (2026-10-22). They apply to every page, feature and backlog task; a task isn't done until it meets them.

1. **Responsive on all devices.** Consider phones, tablets and larger displays for every page. On a phone, layouts fit a 375px-wide screen without horizontal scrolling, touch targets are large enough to tap, and nothing depends on hover or a keyboard shortcut alone. Check every change at mobile width as well as desktop, and any backlog task that would be desktop-only should say how it works on mobile.
2. **Native controls look the same everywhere.** Where browsers render them differently, style them: dialog boxes, buttons, text fields, selects (dropdowns), checkboxes and radio buttons.
3. **Interactive things react to the cursor; nothing else does.** Anything clickable changes when the cursor is over it. Anything that isn't clickable doesn't change on hover.
4. **View hierarchy: Global, then App, then View.** Libraries and global styles are the base, app-wide changes sit on top, and each view overrides what it inherits (see Inheritance in [code-requirements.md](code-requirements.md)).
5. **Text never touches the edge of the viewport.** Text at the edge looks cut off; use margin or padding to keep it in.
6. **Animations are fast (150ms).** Longer animations distract.
7. **Hover and other state changes never change an element's size or position**, since that makes clicking glitchy. The only exception is when the hover or click mask stays the same.
8. **UI text that no one would select isn't selectable**: buttons, dropdowns, icons.
9. **Views only show things of value.** For example, don't show pagination when there's only one page.

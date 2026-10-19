# Introduction

Inertia is an app for documents, spreadsheets, and tasks.

See docs/rules for rules to follow.

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

## UI component organization

Reuse the existing online workspace layout and sidebar across clients. The Mac shell loads `WorkspaceLayout.tsx` and `file-manager/Sidebar.tsx` through WKWebView; do not create another native workspace/sidebar layout. Native login and local task-file UI use shared SwiftUI components. Keep the platform components organized separately. Native macOS UI belongs in `macos/Sources/Inertia/Components/`; React UI belongs in `frontend/src/components/`. Both directories include their screens, editors, and reusable controls. App entrypoints handle lifecycle/routing and compose these components.

Native screens belong in `Components/Screens/`, editor forms in `Components/Editors/`, and shared controls in the component root. Reuse the shared text-field style, provider buttons, editor sheets/actions, optional fields, notes editors, progress, and errors. Use standard SwiftUI controls for native behavior.

React screens belong in `components/screens/`, authentication UI in `components/auth/`, and document/spreadsheet/table editors in `components/editors/`. Import buttons, inputs, selects, text areas, and errors from `@/components/ui`; raw HTML controls belong only in those primitive definitions. Preserve native HTML props and refs. Use button variants for common actions and class overrides only for contextual layout or specialized controls.

The design system is Volta (github.com/kriogenx0/volta): the React frontend's radius, motion, type and control styles come from Volta (`frontend/src/styles/_volta.scss`), themed with Inertia's teal palette in `_theme.scss`; see `docs/ui-components.md`. Change a shared component to change its appearance everywhere. Avoid duplicate control implementations in individual screens. Keep text fields at a 40-point minimum on macOS and a 40-pixel minimum in React, with consistent focus and disabled states. Checkboxes and radios retain their appropriate compact dimensions.

The document filesystem has one permanent Root per workspace. Put ordinary top-level folders and new files under it, preserve existing IDs when migrating hierarchy, and protect Root from moving, archiving, or deletion. Render it using the existing sidebar tree and collect pinned items recursively.



# AGENTS

## Documentation
Keep docs update-to-date with architecture and architecural diagrams in the docs folder. README.md and all docs should live here. AGENTS.md should be up-to-date with valuable information for other AI agents. CLAUDE.md should point to AGENTS.md. Keep all docs in /docs if possible unless they must be in the root (like AGENTS.md and CLAUDE.md).
Always document all internal/external services used, why they are used, and required configuration variables.

## Larger Initiatives
Larger initiatives should be documented in docs/backlog.md. They don't need to be completed now but can be picked up by an agent later.


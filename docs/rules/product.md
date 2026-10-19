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

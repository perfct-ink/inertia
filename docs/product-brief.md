# Inertia — Product Brief

## Product idea

Inertia is a cross-platform workspace for creating and organizing documents, spreadsheets, and tasks in one connected place, grouped into Spaces. It should feel familiar to people who like Google Docs and Quip, while making it easier to find and manage work over time.

The target experience includes a web app, a native macOS app, and a native iPhone app. The same spaces and content should stay in sync across all three.

## The problem

People end up splitting their work across a document editor, spreadsheet app, notes archive, and task manager. Information gets duplicated, tasks lose their context, and useful files become difficult to find.

Existing tools each solve part of the problem:

- Google Docs offers familiar collaborative writing, but the Mac experience is primarily web-based.
- Quip brings documents, spreadsheets, and task lists together, but its organization can be difficult to navigate.
- Evernote is useful for collecting and finding notes, but can feel limiting when work needs richer documents, spreadsheets, and connected tasks.
- Coda (now Superhuman Docs) offers flexible documents, formulas, and structured tables, but its tables are closer to databases than traditional spreadsheets.

Inertia should combine these useful ideas without making organization an afterthought.

## Product principles

1. **Documents are a first-class workspace.** Rich-text documents should support familiar formatting, collaboration, comments, and reusable templates.
2. **Spreadsheets are real spreadsheets.** Users need a grid with formulas and familiar spreadsheet behavior, both as standalone sheets and, where practical, embedded in documents.
3. **Organization is part of the product.** Spaces, folders, clear navigation, search, and useful document indexes should make it easy to put things away and find them again.
4. **Tasks keep their context.** A task can be created inside a document or associated with a section, then found again in a space-wide task view.
5. **One coherent cross-platform experience.** Web, Mac, and iPhone should work with the same content and provide an interface suited to each device.

## Core user needs

- Create and edit documents, spreadsheets, and structured tables.
- Organize content in a predictable hierarchy and search across it.
- Keep tasks connected to the documents or projects that explain them.
- See tasks across documents in one place, with status and due dates.
- Use your spaces on Mac, iPhone, and the web without maintaining separate copies.

## Product direction

Inertia should make it possible to start with a document and add structure as needed: a checklist can become trackable work, a spreadsheet can remain a full grid, and a collection can hold structured records. These content types should relate to one another without forcing every use case into the same table model.

A useful distinction:

- **Documents** are for writing and collaboration.
- **Spreadsheets** are for flexible cell-based work and formulas.
- **Collections** are for typed records, relations, filters, and multiple views.
- **Tasks** are actionable items with status and dates, linked to their source context.

## Experience priorities

### Organization

- Make folders and the space hierarchy visible and easy to navigate.
- Provide a quick-capture or inbox destination for items that are not filed yet.
- Support search across document titles and contents, with filters that help narrow results.
- Make it easy to see where an item lives and which documents, tasks, or records link to it.

### Documents and spreadsheets

- Keep document editing approachable for people coming from Google Docs or Quip.
- Support standalone spreadsheets with familiar formulas and grid interaction.
- Allow users to connect a sheet to related documents and tasks without losing the sheet's independent identity.

### Tasks

- Let users create a task from a checklist item or other document content.
- Preserve a link back to the source document and relevant heading or section.
- Provide a space-wide task list, plus filters by document, project, status, and due date.

### Cross-platform use

- Treat the web app, native macOS app, and native iPhone app as supported product surfaces.
- Keep navigation, editing, search, and task workflows consistent while adapting controls to each device.
- Define offline behavior and sync conflict handling as explicit product requirements.

## Success criteria

A user should be able to:

- Create a document, spreadsheet, and task without leaving Inertia.
- Find a saved document later by browsing its location or searching for it.
- See every open task in a central view and jump back to the document where it was created.
- Continue working across Mac, iPhone, and web without wondering which copy is current.

## Scope note

This brief captures the product goal and user needs. It does not prescribe implementation details or claim that every listed capability is already complete. Feature status and technical decisions belong in the relevant project documentation.

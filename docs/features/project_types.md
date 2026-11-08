# Project types

## What it does
A project has a type: software, music release, video, event, marketing campaign, writing or content, personal, or blank. A type is the starting point of a project: it sets what the project starts with, and it labels the project afterwards.

- **New project** (the Projects page button, the `+` in the sidebar's project list, and "New project..." in the open project's dropdown) opens a dialog (`components/project/NewProjectDialog.tsx`): a name, and a type picked from cards (one column on a phone, two from 640px). Create makes the project with what the type starts it with, in one step: if any part fails nothing is created and the error shows in the dialog.
- **What each built-in type starts with** (`data/projectType.ts`; documents are TipTap content, so their checklist lines become Space tasks once the document is opened, see `document_task_lines.md`):

  | Type | Icon | Documents | Collections (fields) | Tasks |
  | --- | --- | --- | --- | --- |
  | Blank | none | none | none | none |
  | Software | 🛠️ | Product requirements (the PRD template) | none | Write the requirements, Design, Build, Test, Release |
  | Music release | 🎵 | Release plan (release date, format, distributor, UPC and ISRC, the pitch at least 7 days before release, promo), Song 1 (the Song template) | Tracks (Title, ISRC, Mixed, Mastered) | the release checklist worked back from the release date: write and record, mix and master, artwork, credits and metadata, upload to the distributor, pitch to editors, music video, promo, release day, follow-up |
  | Video | 🎬 | Brief, Script | Shot list (Shot, Location, Date, Done) | Concept and brief, Script, Storyboard, Shoot, Edit, Review and revisions, Publish |
  | Event | 🎉 | Event plan | Guest list (Name, Email, Attending) | Set the date and budget through Thank guests and review (8) |
  | Marketing campaign | 📣 | Campaign brief | Content calendar (Post, Channel, Publish date, Published) | Write the brief through Report the results (6) |
  | Writing or content | ✍️ | Outline, Draft | none | Outline, First draft, Revise, Edit, Publish |
  | Personal | 🏠 | Notes | none | none |

  The type's icon becomes the project's icon (change it as usual). The tasks are filed in the project (`folder_id`), so they show on its Tasks page.
- **Your own types.** "Save as type..." (the open project's dropdown, and the bookmark button on each project card on the Projects page) saves a project as a type of the Space under a name: new projects of that type start with the documents, sheets, Collection fields and tasks that are in the project now. Saved types are listed under "Your types" in the New project dialog, with what each starts with and a delete button (it asks first, and projects made from it keep everything in them and read as blank).
- **Type on an existing project.** Each project card has a Type select (built-in and saved types) in its details. Changing it only relabels the project; nothing is added to it. Projects made before types read as Blank.
- The project made by "new document" with no project open ("Personal Project", see `projects.md`) gets the Personal type with no starting content.

## How a project holds its type
`folders.project_type` is a string key, default `blank`: a built-in key (`blank software music_release video event marketing_campaign writing personal`) or `custom_<id>` for a saved type. It is a string and not an enum because a Space can save types of its own, and it is a key and not a foreign key because it is only a label once the project exists: what a type starts a project with is copied into the project when it is created, so a project never depends on its type afterwards. `Folder` accepts a key only if it is built in or a saved type of the same Space; deleting a saved type sets its projects to `blank`; copying a project to another Space keeps a built-in key and drops a saved one to `blank` (a move does the same).

## API and models
- Migrations `20261107050001_add_project_type_to_folders` (the column) and `20261107050002_create_project_types`.
- `project_types` table: `workspace_id`, `name` (1 to 60 characters, unique per Space ignoring case), `description`, `icon`, `template` (json). `ProjectType` (`backend/app/models/project_type.rb`) holds `BUILT_IN` (keep it the same as `BUILT_IN_KEYS` in `frontend/src/data/projectType.ts`), `known_key?`, `for_key`, `key_for` and the `custom_<id>` key. The built-in types are not rows.
- `ProjectTemplate` (`backend/app/services/project_template.rb`) is what a project starts with: `{documents: [{title, doc_type: document|spreadsheet, content}], collections: [{title, fields: [{name, data_type}]}], tasks: [{title}]}`. `clean` makes a safe copy of whatever was sent (known keys only; at most 20 documents, 10 Collections, 30 fields each, 100 tasks, 1 MB; field types text, integer, number, boolean, date, datetime; raises a readable `ProjectTemplate::Invalid`), `snapshot(folder)` builds the template of a project, and `apply` creates the records. Checklist lines in a document lose their `taskId` (through `SpaceTransfer.remap_task_ids`), so the editor makes new tasks in the new project instead of pointing at the old ones.
- `POST /api/v1/folders` takes `folder: {name, kind: "project", project_type, icon}` and, optionally, `template`. A built-in type's template is sent by the web app; with no `template` and a saved type's key, the server uses that type's own template. The folder and everything the template makes are saved in one transaction. `template` on anything but a project is a 422. `project_type` is also permitted on `PATCH /api/v1/folders/:id` and returned by `FolderBlueprint`.
- `GET /api/v1/project_types` lists the Space's saved types (`id`, `key`, `name`, `description`, `icon`, `starts_with: {documents, collections, tasks}`; the template itself is not sent). `POST /api/v1/project_types` `{project_type: {name, description, icon, from_folder_id}}` saves a project of the Space as a type (422 for a folder that is not a project, a duplicate name, or a project with more than a template holds). `DELETE /api/v1/project_types/:id`.
- Frontend: `data/projectType.ts` (the built-in types and templates, labels, `projectStart`, `describeStart`), `data/documentTemplate.ts` (the block builders and `withTitle` are exported for it), `api/projectTypes.ts` (`ProjectTypeApi`, `useProjectTypes`, `useSaveProjectType`, `useDeleteProjectType`), `api/folders.ts` (`createProject`, `useCreateProject`), `components/project/NewProjectDialog.tsx` and `SaveProjectTypeDialog.tsx`.

## Who can view and change
Anyone in the Space can see the saved types. Creating a project, saving a type, deleting a type and changing a project's type need the member role or above, like the rest of the Space API; viewers get 403 and another Space's types and projects are a 404. Saving or deleting a type is not limited to admins.

## Web entry points
Projects page (`view/projects/ProjectsScreen.tsx`), the sidebar's project list and open-project dropdown (`components/file-manager/ProjectNav.tsx`), the project card's details (`components/ProjectDetails.tsx`).

## Tests
- Backend: `test/models/project_type_test.rb`, `test/services/project_template_test.rb`, `test/controllers/project_types_controller_test.rb`, `test/controllers/folder_project_types_test.rb` (create with a template, atomic, saved-type template, type change), `test/models/folder_test.rb`, `test/services/space_transfer_test.rb` (the type through a copy or move).
- Frontend: `data/projectType.test.ts`, `data/documentTemplate.test.ts`, `api/projectTypes.test.ts`, `components/project/NewProjectDialog.test.tsx`, `SaveProjectTypeDialog.test.tsx`, `components/ProjectDetails.test.tsx`, `components/file-manager/ProjectNav.test.tsx`, `view/projects/ProjectsScreen.test.tsx`, `hooks/useNewDocument.test.tsx`.

## Decisions (made for Alex; change them if you disagree)
- **The type is a string key on the folder**, not an enum (the first version of this task, on the older branch, used an enum: it cannot hold the Space's own types) and not a foreign key to a types table (a project only needs its label afterwards).
- **Built-in templates live in the web app**, next to the document templates they reuse, and are sent when a project is created. Putting them in Rails too would duplicate every template.
- **"Features the Space or project uses" is not applied.** There is no per-project or per-Space features setting on `main` yet (`docs/backlog/choose-which-features-a-project-uses.md` and `choose-which-features-a-space-uses.md` build it, on their own branches). A second column for it here would collide with them. When they land, a type should gain a `features` list in its template and set it on the new project.
- **A type does not create task fields.** Task fields (`task_fields.md`) are Space-wide, and the first one turns on the Fields controls on every task row in the Space, so creating one as a side effect of making a project would change the whole Space. A template's "fields" are the fields of its Collections.
- **Saved types are per Space and not shared across Spaces**, and any member who can write may save or delete one.
- **Saving a project as a type flattens its subfolders** into the project, and refuses a project with more than the limits above rather than dropping some silently.

## Known limits
- A saved type has no rename or edit; save the project again under a new name and delete the old type.
- A saved type is a snapshot: it does not follow later changes to the project it came from.
- Not in a saved type: uploaded files, Collection records, Collection fields that link to other Collections or hold files or formulas, subfolder structure, tasks that belong to documents (the checklist lines in the documents come back as new tasks), subtasks, and a task's status, dates, assignee and other planning fields (tasks start in the backlog).
- Changing the type of an existing project relabels it only.
- Built-in templates are not editable by a Space.
- No type column or filter on the Portfolio yet.
- Recurring and ongoing tasks from the same request are separate backlog items (`ongoing-tasks-with-check-ins.md`).

## History
- 2026-10-19: first slice on branch `backlog/project-types` (an integer enum, a picker and a label); not merged.
- 2026-11-07: finished on the same branch, rebased onto `main`: string key, saved types, templates, the dialogs. Not merged or deployed.
- Not verified: `rails db:migrate` (schema diff), `rails test`, `npm run lint`, `tsc -b`, the real Jest run and the dialogs in a browser (desktop and 375px, light and dark) did not run (no network, node_modules, database or browser here). Ran: `ruby -c` on the Ruby files, the pure `ProjectTemplate.clean` cases with `ruby -e`, the data tests, and the component tests in the Jest stand-in.

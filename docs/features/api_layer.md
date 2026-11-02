# API layer (base class plus one class per model)

## What it does
Every call the web app makes to the Rails API goes through `frontend/src/lib/api.ts` (the HTTP client: bearer token, `X-Workspace-Id`, error notices, sign-out on 401). On top of it, `frontend/src/api/` has a base file and one file per model.

- `api/base.ts`: `ApiResource<Model, CreateInput, UpdateInput>`, the base class, with `list`, `find`, `create`, `update` and `destroy`. A model's class passes its path (`/api/v1/epics`), the Rails param key the body is wrapped in (`epic`, or `null` to send the fields as the body) and the root of its query keys (`epics`). The same file has the hook helpers the model files use: `useApiMutation` (call, then refetch the listed queries) and `useResourceList`, `useResourceFind`, `useResourceCreate`, `useResourceUpdate`, `useResourceDelete`.
- One file and one class per model, each exporting an instance and the hooks the views use: `epics.ts` (`EpicApi`), `initiatives.ts`, `milestones.ts`, `sprints.ts`, `objectives.ts`, `keyResults.ts`, `tasks.ts`, `taskDependencies.ts`, `events.ts`, `documents.ts`, `folders.ts`, `workspaces.ts`, `workspaceMembers.ts`, `tables.ts`, `quipImports.ts`, and `workspace.ts` (`ActiveWorkspaceApi`, the singleton `/api/v1/workspace`).
- Model-specific calls are methods on the class: `TaskApi.create` accepts camelCase fields and posts under a document when given one, `EventApi.addTask`/`removeTask`, `DocumentApi.createIn(folderId, ...)`, `FolderApi.contents(id)`, `TableApi.edit(...)`.

The hook names, their arguments and what each one refetches are the same as before the refactor, so the views did not change. What moved: the folder hooks (`useCreateFolder`, `useUpdateFolder`, `usePinFolder`, `useDeleteFolder`, `useArchivedFolders`, `useFolderContents`) from `workspace.ts` to `folders.ts`; the document hooks (`useCreateDocument`, `useDeleteDocument`, `usePinDocument`, `useMoveDocument`) from `workspace.ts` to `documents.ts`; the member hooks from `workspaces.ts` to `workspaceMembers.ts`; and the key result hooks from `objectives.ts` to `keyResults.ts`. Imports and the tests' module mocks were updated to match.

## API and models
No backend change. A new model's client is a class extending `ApiResource` in its own file, for example:

```ts
export class EpicApi extends ApiResource<Epic, { title: string }> {
  constructor() { super('/api/v1/epics', 'epic', 'epics') }
}
export const epicApi = new EpicApi()
export const useCreateEpic = () => useResourceCreate(epicApi, ['milestones'])
```

## Who can view and change
Nothing changed: the server decides, scoped to the active Space by `X-Workspace-Id`. A failed call still shows an error notice (the client's interceptor) and a 401 still signs the user out; failed mutations refetch nothing.

## Web entry points
Every view and component that reads or writes data, through the hooks above.

## Tests
`frontend/src/api/base.test.tsx` covers the class (paths, bodies with and without a param key) and the hooks (query keys, the default `staleTime` kept, create/update/delete refetching the right queries, nothing refetched after a failure). The existing view tests mock these modules by path; the ones for the moved hooks (`CreateItem`, `GettingStarted`, `OkrsScreen`, `ProjectsScreen`) were pointed at the new modules.

## Known limits
- `tables.ts` still re-exports `errorMessage` for the components that import it from there; they should import `@/util/errorMessage` (not changed here).
- Cache keys are unchanged, including the singular `document`/`table` roots; the model files, not the base, decide what each change refetches.

## History
- Implemented 2026-11-01 on branch `backlog/base-api-file-plus-one-class-per-model`; not merged or deployed.
- Not verified: `npm run lint`, `tsc`, the Jest suite (including the new `base.test.tsx`) and the app in a browser were not run (no `node_modules`). Run offline: a syntax, import and undefined-name check of every changed file.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

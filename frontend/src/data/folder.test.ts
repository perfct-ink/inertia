import type { Document, Folder, SpaceFolder } from '@/types'
import { documentsIn, filterSpaceFiles, flattenFolders, folderChoices, projectLastModified, projectsOf, searchSpaceFiles, spaceFiles, folderTrail, featureFoldersOf, homeDocumentToOpen, sortFileRows, uploadedFiles } from './folder'
import type { FileRow } from './folder'

const folder = (id: number, children: Folder[] = []) => ({ id, name: `F${id}`, children }) as unknown as Folder

test('flattenFolders lists each folder before its descendants', () => {
  const tree = [folder(1, [folder(2, [folder(3)]), folder(4)]), folder(5)]
  expect(flattenFolders(tree).map((f) => f.id)).toEqual([1, 2, 3, 4, 5])
})

const doc = (id: number, title: string, updated = '2026-10-01T00:00:00Z') =>
  ({ id, title, doc_type: 'document', updated_at: updated, content_updated_at: null }) as unknown as Document

const tree = (): Folder[] => [{
  id: 1, name: 'Root', root: true, kind: 'folder', documents: [doc(1, 'Readme')],
  children: [
    {
      id: 2, name: 'Messages', kind: 'project', documents: [doc(2, 'Spec', '2026-10-05T00:00:00Z')],
      children: [{ id: 3, name: 'Design', kind: 'folder', documents: [doc(3, 'Mockups', '2026-10-09T00:00:00Z')], children: [] }],
    },
    { id: 4, name: 'Archive', kind: 'project', archived: true, documents: [], children: [] },
    { id: 5, name: 'Billing', kind: 'project', documents: [], children: [] },
  ],
}] as unknown as Folder[]

test('spaceFiles lists every document with its path and nearest project', () => {
  const files = spaceFiles(tree())
  expect(files.map((f) => [f.document.title, f.path.join('/'), f.project?.name ?? null])).toEqual([
    ['Readme', '', null],
    ['Spec', 'Messages', 'Messages'],
    ['Mockups', 'Messages/Design', 'Messages'],
  ])
})

test('searchSpaceFiles matches titles and folder names, ignoring case', () => {
  const files = spaceFiles(tree())
  expect(searchSpaceFiles(files, 'design').map((f) => f.document.title)).toEqual(['Mockups'])
  expect(searchSpaceFiles(files, ' READ ').map((f) => f.document.title)).toEqual(['Readme'])
  expect(searchSpaceFiles(files, '')).toHaveLength(3)
})

test('projectsOf lists active projects by name', () => {
  expect(projectsOf(tree()).map((f) => f.name)).toEqual(['Billing', 'Messages'])
})

test('documentsIn and projectLastModified cover nested folders', () => {
  const messages = tree()[0].children[0]
  expect(documentsIn(messages).map((d) => d.title)).toEqual(['Spec', 'Mockups'])
  expect(projectLastModified(messages)).toBe('2026-10-09T00:00:00Z')
  expect(projectLastModified(tree()[0].children[2])).toBeNull()
})

test('filterSpaceFiles filters by project, type and owner, and an unset filter matches all', () => {
  const owned = (d: Document, owner: number, type: Document['doc_type'] = 'document') => ({ ...d, created_by_id: owner, doc_type: type }) as Document
  const t = tree()
  t[0].documents = [owned(t[0].documents[0], 7)]
  t[0].children[0].documents = [owned(t[0].children[0].documents[0], 8, 'spreadsheet')]
  t[0].children[0].children[0].documents = [owned(t[0].children[0].children[0].documents[0], 7)]
  const files = spaceFiles(t)

  expect(filterSpaceFiles(files, {})).toHaveLength(3)
  expect(filterSpaceFiles(files, { projectId: 2 }).map((f) => f.document.title)).toEqual(['Spec', 'Mockups'])
  expect(filterSpaceFiles(files, { projectId: 0 }).map((f) => f.document.title)).toEqual(['Readme'])
  expect(filterSpaceFiles(files, { docType: 'spreadsheet' }).map((f) => f.document.title)).toEqual(['Spec'])
  expect(filterSpaceFiles(files, { ownerId: 7 }).map((f) => f.document.title)).toEqual(['Readme', 'Mockups'])
  expect(filterSpaceFiles(files, { projectId: 2, ownerId: 7 }).map((f) => f.document.title)).toEqual(['Mockups'])
})

const spaceFolder = (id: number, name: string, parent_id: number | null, position = 0, root = false): SpaceFolder =>
  ({ id, name, parent_id, position, root })

test("folderChoices lists a Space's folders in tree order with their paths", () => {
  const folders = [
    spaceFolder(4, 'Design', 2),
    spaceFolder(3, 'Billing', 1, 1),
    spaceFolder(2, 'Messages', 1, 0),
    spaceFolder(1, 'Root', null, 0, true),
  ]
  expect(folderChoices(folders)).toEqual([
    { id: 1, label: 'Top level' },
    { id: 2, label: 'Messages' },
    { id: 4, label: 'Messages / Design' },
    { id: 3, label: 'Billing' },
  ])
})

test('folderChoices orders siblings by position, then name, and skips folders cut off from the top', () => {
  const folders = [
    spaceFolder(1, 'Root', null, 0, true),
    spaceFolder(2, 'Zeta', 1, 0),
    spaceFolder(3, 'Alpha', 1, 0),
    spaceFolder(4, 'Orphan', 99, 0),
  ]
  expect(folderChoices(folders).map((c) => c.label)).toEqual(['Top level', 'Alpha', 'Zeta'])
  expect(folderChoices([])).toEqual([])
})

test('folderTrail lists the folders from the top down, without Root', () => {
  expect(folderTrail(tree(), 3).map((f) => f.name)).toEqual(['Messages', 'Design'])
  expect(folderTrail(tree(), 2).map((f) => f.name)).toEqual(['Messages'])
  expect(folderTrail(tree(), 1)).toEqual([])
  expect(folderTrail(tree(), 99)).toEqual([])
})

test('featureFoldersOf lists active feature folders by name', () => {
  const f = (id: number, name: string, kind: Folder['kind'], archived = false, children: Folder[] = []) => ({ id, name, kind, archived, children, documents: [] }) as unknown as Folder
  const tree = [f(1, 'Root', 'folder', false, [f(2, 'Zeta', 'feature'), f(3, 'Alpha', 'feature', false, [f(4, 'Old', 'feature', true)]), f(5, 'Plain', 'folder')])]
  expect(featureFoldersOf(tree).map((x) => x.name)).toEqual(['Alpha', 'Zeta'])
})

test('a folder opens on its home document unless a specific view was asked for', () => {
  expect(homeDocumentToOpen({ home_document_id: 9 }, '')).toBe(9)
  expect(homeDocumentToOpen({ home_document_id: 9 }, '?view=board')).toBeNull()
  expect(homeDocumentToOpen({ home_document_id: null }, '')).toBeNull()
  expect(homeDocumentToOpen({}, '')).toBeNull()
})

test('sortFileRows sorts by name, location or last modified in either direction without changing the input', () => {
  const row = (id: number, title: string, location: string, updated: string) =>
    ({ id, title, location, updated_at: updated, content_updated_at: null, folderId: 1, inProject: false }) as unknown as FileRow
  const rows = [row(1, 'b', 'Z', '2026-10-02T00:00:00Z'), row(2, 'a', 'Y', '2026-10-03T00:00:00Z'), row(3, 'c', 'X', '2026-10-01T00:00:00Z')]
  expect(sortFileRows(rows, 'name', 'asc').map((r) => r.id)).toEqual([2, 1, 3])
  expect(sortFileRows(rows, 'name', 'desc').map((r) => r.id)).toEqual([3, 1, 2])
  expect(sortFileRows(rows, 'location', 'asc').map((r) => r.id)).toEqual([3, 2, 1])
  expect(sortFileRows(rows, 'modified', 'desc').map((r) => r.id)).toEqual([2, 1, 3])
  expect(rows.map((r) => r.id)).toEqual([1, 2, 3])
})

test('uploadedFiles lists the uploaded files of the whole tree and skips other documents', () => {
  const file = (id: number) => ({ ...doc(id, `f${id}.pdf`), doc_type: 'file' }) as unknown as Document
  const nested = tree()
  nested[0].documents = [file(10), doc(1, 'Readme')]
  nested[0].children![0].children![0].documents = [file(11)]
  expect(uploadedFiles(nested).map((d) => d.id)).toEqual([10, 11])
})

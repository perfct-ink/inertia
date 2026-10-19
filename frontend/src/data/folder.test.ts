import type { Document, Folder } from '@/types'
import { documentsIn, flattenFolders, folderTrail, projectLastModified, projectsOf, searchSpaceFiles, spaceFiles } from './folder'

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

test('folderTrail lists the folders from the top down, without Root', () => {
  expect(folderTrail(tree(), 3).map((f) => f.name)).toEqual(['Messages', 'Design'])
  expect(folderTrail(tree(), 2).map((f) => f.name)).toEqual(['Messages'])
  expect(folderTrail(tree(), 1)).toEqual([])
  expect(folderTrail(tree(), 99)).toEqual([])
})

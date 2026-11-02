import {
  buildPathIndex, documentHref, folderHref, idPath, itemAtPath, itemHref, joinPath, parseIdPath, pathIndexFor,
  redirectFor, resolvePath, splitPath,
} from './path'
import type { Document, Folder } from '@/types'

const doc = (id: number, slug: string | null, folder_id: number): Document =>
  ({ id, title: slug ?? 'Untitled', slug, doc_type: 'document', folder_id, pinned: false, created_at: '', updated_at: '', content_updated_at: null })

const folder = (id: number, slug: string | null, children: Folder[] = [], documents: Document[] = [], root = false): Folder => ({
  id, name: slug ?? 'Root', slug, kind: 'folder', parent_id: null, root, position: 0, pinned: false, archived: false,
  archived_at: null, children, documents, has_tasks: false, has_events: false,
})

// Root (1)
//   loose (doc 9)
//   product/ (2)
//     feature-folders/ (3)
//       requirements (doc 10)
//   no-slug/ (4, legacy folder without a slug)
//     hidden (doc 11)
const tree = (): Folder[] => [
  folder(1, null, [
    folder(2, 'product', [folder(3, 'feature-folders', [], [doc(10, 'requirements', 3)])]),
    folder(4, null, [], [doc(11, 'hidden', 4)]),
  ], [doc(9, 'loose', 1)], true),
]

test('splitPath lowercases, decodes and drops empty parts', () => {
  expect(splitPath('/Acme//product/')).toEqual(['acme', 'product'])
  expect(splitPath('/')).toEqual([])
  expect(splitPath('/caf%C3%A9')).toEqual(['café'])
  expect(splitPath('/100%/x')).toEqual(['100%', 'x'])
})

test('joinPath and idPath build paths', () => {
  expect(joinPath(['acme', 'product'])).toBe('/acme/product')
  expect(joinPath([])).toBe('/')
  expect(idPath({ type: 'document', id: 12 })).toBe('/documents/12')
  expect(idPath({ type: 'folder', id: 3 })).toBe('/folders/3')
})

test('parseIdPath reads only the id paths', () => {
  expect(parseIdPath('/documents/12')).toEqual({ type: 'document', id: 12 })
  expect(parseIdPath('/folders/3/')).toEqual({ type: 'folder', id: 3 })
  expect(parseIdPath('/documents')).toBeNull()
  expect(parseIdPath('/documents/12/more')).toBeNull()
  expect(parseIdPath('/product/requirements')).toBeNull()
})

test('the index holds the slug path of every item and leaves the Root out', () => {
  const index = buildPathIndex(tree())
  expect(index.rootId).toBe(1)
  expect(index.folders.get(2)).toBe('/product')
  expect(index.folders.get(3)).toBe('/product/feature-folders')
  expect(index.documents.get(10)).toBe('/product/feature-folders/requirements')
  expect(index.documents.get(9)).toBe('/loose')
  expect(index.folders.has(1)).toBe(false)
})

test('an item without a slug, and everything under it, is left out', () => {
  const index = buildPathIndex(tree())
  expect(index.folders.has(4)).toBe(false)
  expect(index.documents.has(11)).toBe(false)
})

test('links fall back to the id path when the slug path is not known', () => {
  const index = buildPathIndex(tree())
  expect(folderHref(index, 3)).toBe('/product/feature-folders')
  expect(folderHref(index, 4)).toBe('/folders/4')
  expect(folderHref(index, 1)).toBe('/folders/1')
  expect(documentHref(index, { id: 10 })).toBe('/product/feature-folders/requirements')
  expect(documentHref(index, { id: 11 })).toBe('/documents/11')
  expect(documentHref(buildPathIndex([]), { id: 5 })).toBe('/documents/5')
})

test('a document not in the tree yet is linked from its folder and slug', () => {
  const index = buildPathIndex(tree())
  expect(documentHref(index, { id: 50, folder_id: 3, slug: 'new-doc' })).toBe('/product/feature-folders/new-doc')
  expect(documentHref(index, { id: 51, folder_id: 1, slug: 'at-root' })).toBe('/at-root')
  expect(documentHref(index, { id: 52, folder_id: 4, slug: 'x' })).toBe('/documents/52')
  expect(documentHref(index, { id: 53, folder_id: 3, slug: null })).toBe('/documents/53')
})

test('itemHref picks the folder or document link', () => {
  const index = buildPathIndex(tree())
  expect(itemHref(index, { type: 'folder', id: 2 })).toBe('/product')
  expect(itemHref(index, { type: 'document', id: 9 })).toBe('/loose')
})

test('pathIndexFor builds once per payload', () => {
  const folders = tree()
  expect(pathIndexFor(folders)).toBe(pathIndexFor(folders))
  expect(pathIndexFor(tree())).not.toBe(pathIndexFor(folders))
})

test('resolvePath finds folders and documents by their slugs', () => {
  const folders = tree()
  expect(resolvePath(folders, ['product'])).toEqual({ type: 'folder', id: 2 })
  expect(resolvePath(folders, ['product', 'feature-folders'])).toEqual({ type: 'folder', id: 3 })
  expect(resolvePath(folders, ['product', 'feature-folders', 'requirements'])).toEqual({ type: 'document', id: 10 })
  expect(resolvePath(folders, ['loose'])).toEqual({ type: 'document', id: 9 })
})

test('resolvePath returns null for paths that name nothing', () => {
  const folders = tree()
  expect(resolvePath(folders, [])).toBeNull()
  expect(resolvePath(folders, ['nope'])).toBeNull()
  expect(resolvePath(folders, ['product', 'requirements'])).toBeNull()
  expect(resolvePath(folders, ['loose', 'deeper'])).toBeNull()
  expect(resolvePath(folders, ['product', 'feature-folders', 'requirements', 'x'])).toBeNull()
})

test('a tree without a flagged Root is read from the top', () => {
  const folders = [folder(2, 'product', [], [doc(10, 'spec', 2)])]
  expect(resolvePath(folders, ['product', 'spec'])).toEqual({ type: 'document', id: 10 })
  expect(buildPathIndex(folders).documents.get(10)).toBe('/product/spec')
})

test('itemAtPath reads id paths and slug paths', () => {
  const folders = tree()
  expect(itemAtPath(folders, '/documents/10')).toEqual({ type: 'document', id: 10 })
  expect(itemAtPath(folders, '/product/feature-folders')).toEqual({ type: 'folder', id: 3 })
  expect(itemAtPath(folders, '/Product/')).toEqual({ type: 'folder', id: 2 })
  expect(itemAtPath(folders, '/tasks')).toBeNull()
  expect(itemAtPath(folders, '/space')).toBeNull()
})

test('redirectFor sends id paths and non-canonical spellings to the slug path', () => {
  const index = buildPathIndex(tree())
  const requirements = { type: 'document', id: 10 } as const
  expect(redirectFor(index, requirements, '/documents/10')).toBe('/product/feature-folders/requirements')
  expect(redirectFor(index, requirements, '/Product/Feature-Folders/Requirements')).toBe('/product/feature-folders/requirements')
  expect(redirectFor(index, requirements, '/product/feature-folders/requirements/')).toBe('/product/feature-folders/requirements')
})

test('redirectFor stays put on the right path or when no slug path is known', () => {
  const index = buildPathIndex(tree())
  expect(redirectFor(index, { type: 'document', id: 10 }, '/product/feature-folders/requirements')).toBeNull()
  expect(redirectFor(index, { type: 'document', id: 11 }, '/documents/11')).toBeNull()
  // Found through the server, but the tree has not caught up: don't bounce to the id path.
  expect(redirectFor(index, { type: 'document', id: 99 }, '/product/just-created')).toBeNull()
})

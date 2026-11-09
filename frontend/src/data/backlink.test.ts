import type { Document, Folder } from '@/types'
import { backlinkLocation, backlinksTitle } from './backlink'

const folder = (id: number, name: string, children: Folder[] = [], root = false) => ({ id, name, root, children }) as unknown as Folder
const tree = [folder(1, 'Root', [folder(2, 'Album', [folder(3, 'Songs')])], true)]
const doc = (folder_id: number) => ({ folder_id }) as Pick<Document, 'folder_id'>

test('the panel title counts the documents, singular for one', () => {
  expect(backlinksTitle(1)).toBe('Linked from 1 document')
  expect(backlinksTitle(3)).toBe('Linked from 3 documents')
})

test('a linking document is located by its folders, without the Root', () => {
  expect(backlinkLocation(tree, doc(3))).toBe('Album / Songs')
  expect(backlinkLocation(tree, doc(2))).toBe('Album')
  expect(backlinkLocation(tree, doc(1))).toBe('')
  expect(backlinkLocation(tree, doc(99))).toBe('')
})

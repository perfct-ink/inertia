import { isFeatureDocument, parentFeatureOptions } from './feature'
import type { Folder } from '@/types'

const folders = [{
  id: 1, name: 'Root', root: true, kind: 'folder', documents: [{ id: 1, title: 'Loose', doc_type: 'document', folder_id: 1 }],
  children: [
    { id: 2, name: 'Features', kind: 'feature', children: [], documents: [{ id: 2, title: 'Zed', doc_type: 'document', folder_id: 2 }, { id: 3, title: 'Alpha', doc_type: 'document', folder_id: 2 }, { id: 4, title: 'Budget', doc_type: 'spreadsheet', folder_id: 2 }] },
  ],
}] as unknown as Folder[]

test('parent options are the ordinary documents of feature folders, by title, without the feature itself', () => {
  expect(parentFeatureOptions(folders).map((d) => d.title)).toEqual(['Alpha', 'Zed'])
  expect(parentFeatureOptions(folders, 3).map((d) => d.title)).toEqual(['Zed'])
})

test('a document is a feature when its folder is a feature folder', () => {
  expect(isFeatureDocument(folders, { folder_id: 2 })).toBe(true)
  expect(isFeatureDocument(folders, { folder_id: 1 })).toBe(false)
  expect(isFeatureDocument(folders, { folder_id: 99 })).toBe(false)
})

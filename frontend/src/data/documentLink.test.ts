import type { Document, Folder } from '@/types'
import { documentIdFromAttribute, documentLinkTrigger, linkableFiles } from './documentLink'

describe('documentLinkTrigger', () => {
  test('a second [ after a [ is the [[ trigger and takes the first bracket out', () => {
    expect(documentLinkTrigger('See [', '[')).toEqual({ trigger: '[[', remove: 1 })
    expect(documentLinkTrigger('', '[')).toBeNull()
    expect(documentLinkTrigger('See ', '[')).toBeNull()
  })

  test('@ is a trigger at the start of a block or after a space, not inside a word', () => {
    expect(documentLinkTrigger('', '@')).toEqual({ trigger: '@', remove: 0 })
    expect(documentLinkTrigger('See ', '@')).toEqual({ trigger: '@', remove: 0 })
    expect(documentLinkTrigger('See\u00a0', '@')).toEqual({ trigger: '@', remove: 0 })
    expect(documentLinkTrigger('mail me at pat', '@')).toBeNull()
    expect(documentLinkTrigger('\ufffc', '@')).toBeNull() // right after another inline node
  })

  test('other characters never trigger, and a trigger left out of the list is ignored', () => {
    expect(documentLinkTrigger('See ', 'a')).toBeNull()
    expect(documentLinkTrigger('See ', '@', ['[['])).toBeNull()
    expect(documentLinkTrigger('See [', '[', ['@'])).toBeNull()
  })
})

test('documentIdFromAttribute reads a whole number above zero', () => {
  expect(documentIdFromAttribute('12')).toBe(12)
  expect(documentIdFromAttribute(null)).toBeNull()
  expect(documentIdFromAttribute('')).toBeNull()
  expect(documentIdFromAttribute('0')).toBeNull()
  expect(documentIdFromAttribute('-3')).toBeNull()
  expect(documentIdFromAttribute('1.5')).toBeNull()
  expect(documentIdFromAttribute('abc')).toBeNull()
})

describe('linkableFiles', () => {
  const doc = (id: number, title: string, updated: string) =>
    ({ id, title, doc_type: 'document', updated_at: updated, content_updated_at: null }) as unknown as Document
  const folders = [{
    id: 1, name: 'Root', root: true, kind: 'folder', documents: [doc(1, 'Notes', '2026-10-01T00:00:00Z')],
    children: [{
      id: 2, name: 'Album', kind: 'project', children: [],
      documents: [doc(2, 'Song A', '2026-10-09T00:00:00Z'), doc(3, 'Budget', '2026-10-05T00:00:00Z')],
    }],
  }] as unknown as Folder[]

  test('lists the most recently changed first when nothing is typed, without the excluded document', () => {
    expect(linkableFiles(folders, '').map((f) => f.document.title)).toEqual(['Song A', 'Budget', 'Notes'])
    expect(linkableFiles(folders, '  ', 2).map((f) => f.document.title)).toEqual(['Budget', 'Notes'])
  })

  test('narrows by title or folder, ignoring case', () => {
    expect(linkableFiles(folders, 'budget').map((f) => f.document.id)).toEqual([3])
    expect(linkableFiles(folders, 'ALBUM').map((f) => f.document.id)).toEqual([2, 3])
    expect(linkableFiles(folders, 'zzz')).toEqual([])
  })

  test('stops at the limit', () => {
    expect(linkableFiles(folders, '', undefined, 2)).toHaveLength(2)
  })
})

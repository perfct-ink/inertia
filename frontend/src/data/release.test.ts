import { releaseKindLabel, songCandidates, sortReleases } from './release'
import type { Folder, Release } from '@/types'

const release = (id: number, title: string, release_date: string | null) => ({ id, title, release_date }) as Release

test('sorts by date with undated last, then title', () => {
  const sorted = sortReleases([release(1, 'B', null), release(2, 'A', '2026-12-01'), release(3, 'A', null), release(4, 'C', '2026-11-01')])
  expect(sorted.map((r) => r.id)).toEqual([4, 2, 3, 1])
})

test('labels kinds', () => {
  expect(releaseKindLabel('ep')).toBe('EP')
  expect(releaseKindLabel('music_video')).toBe('Music video')
})

test('song candidates are documents only, across nested folders, by title', () => {
  const folders = [{ id: 1, documents: [{ id: 1, title: 'Zed', doc_type: 'document' }, { id: 2, title: 'Sheet', doc_type: 'spreadsheet' }],
    children: [{ id: 2, documents: [{ id: 3, title: 'Alpha', doc_type: 'document' }], children: [] }] }] as unknown as Folder[]
  expect(songCandidates(folders).map((d) => d.title)).toEqual(['Alpha', 'Zed'])
})

import { BUILT_IN_KEYS, PROJECT_TYPES, countsOf, describeStart, isBuiltIn, projectStart, projectTypeLabel, projectTypeOf } from './projectType'
import type { SavedProjectType } from '@/types'

type Node = { type: string; text?: string; content?: Node[] }

const saved: SavedProjectType = {
  id: 7, key: 'custom_7', name: 'Podcast season', description: null, icon: null,
  starts_with: { documents: 1, collections: 0, tasks: 3 }, created_at: '2026-11-07T00:00:00Z',
}

test('lists the built-in types once each, blank first, matching the backend list', () => {
  expect(BUILT_IN_KEYS).toEqual(['blank', 'software', 'music_release', 'video', 'event', 'marketing_campaign', 'writing', 'personal'])
  expect(new Set(BUILT_IN_KEYS).size).toBe(BUILT_IN_KEYS.length)
  expect(isBuiltIn('video')).toBe(true)
  expect(isBuiltIn('custom_7')).toBe(false)
})

test('every type has a label, a description, and a template within the server limits', () => {
  for (const type of PROJECT_TYPES) {
    expect(type.label).not.toBe('')
    expect(type.description).not.toBe('')
    const { documents, collections, tasks } = type.template
    expect(documents.length).toBeLessThanOrEqual(20)
    expect(collections.length).toBeLessThanOrEqual(10)
    expect(tasks.length).toBeLessThanOrEqual(100)
    for (const t of [...documents, ...collections, ...tasks]) expect(t.title.trim()).not.toBe('')
    for (const c of collections) {
      const names = c.fields.map((f) => f.name)
      expect(new Set(names).size).toBe(names.length)
    }
  }
})

test('a template places folders and what is in them by position, like the server stores it', () => {
  for (const { template } of PROJECT_TYPES) {
    const folders = template.folders ?? []
    folders.forEach((folder, position) => expect(folder.parent == null || (folder.parent >= 0 && folder.parent < position)).toBe(true))
    for (const item of [...template.documents, ...template.collections, ...template.tasks]) {
      expect(item.folder == null || (item.folder >= 0 && item.folder < folders.length)).toBe(true)
    }
  }
})

test('blank starts empty and the other types start with something', () => {
  expect(describeStart(countsOf(PROJECT_TYPES[0].template))).toBe('')
  for (const type of PROJECT_TYPES.slice(1)) expect(describeStart(countsOf(type.template))).not.toBe('')
})

test('each template document opens with a heading that is its title', () => {
  for (const type of PROJECT_TYPES) {
    for (const document of type.template.documents) {
      const first = (document.content as { content: Node[] }).content[0]
      expect(first.type).toBe('heading')
      expect(first.content?.[0].text).toBe(document.title)
    }
  }
})

test('a music release is worked back from the release date and covers the checklist', () => {
  const music = PROJECT_TYPES.find((t) => t.key === 'music_release')!
  const tasks = music.template.tasks.map((t) => t.title).join('|')
  for (const word of ['recording', 'master', 'Artwork', 'ISRC', 'UPC', 'distributor', '7 days', 'video', 'Promo', 'follow-up']) expect(tasks).toContain(word)
  expect(music.template.collections[0].fields.map((f) => f.name)).toContain('ISRC')
  expect(JSON.stringify(music.template.documents)).toContain('Lyrics')
})

test('labels built-in and saved types, reading no type as blank', () => {
  expect(projectTypeLabel('music_release')).toBe('Music release')
  expect(projectTypeLabel(undefined)).toBe('Blank')
  expect(projectTypeLabel('custom_7', [saved])).toBe('Podcast season')
  expect(projectTypeLabel('custom_9', [saved])).toBe('Custom type')
  expect(projectTypeOf({})).toBe('blank')
  expect(projectTypeOf({ project_type: 'video' })).toBe('video')
})

test('describes what a project starts with', () => {
  expect(describeStart({ documents: 1, collections: 1, tasks: 8 })).toBe('1 document, 1 Collection, 8 tasks')
  expect(describeStart({ documents: 2, collections: 0, tasks: 1 })).toBe('2 documents, 1 task')
  expect(describeStart(saved.starts_with)).toBe('1 document, 3 tasks')
  expect(describeStart({ documents: 0, collections: 0, tasks: 0 })).toBe('')
  expect(describeStart({ folders: 2, documents: 3, collections: 0, tasks: 1 })).toBe('2 folders, 3 documents, 1 task')
  expect(describeStart({ folders: 1, documents: 0, collections: 0, tasks: 0 })).toBe('1 folder')
  expect(describeStart({ folders: 0, documents: 0, collections: 0, tasks: 0 })).toBe('')
})

test('counts the folders of a template, none for a template without any', () => {
  const template = { folders: [{ name: 'Artwork' }, { name: 'Drafts', parent: 0 }], documents: [{ title: 'Brief', content: {}, folder: 1 }], collections: [], tasks: [] }
  expect(countsOf(template)).toEqual({ folders: 2, documents: 1, collections: 0, tasks: 0 })
  expect(countsOf({ documents: [], collections: [], tasks: [] }).folders).toBe(0)
  expect(projectStart('custom_7').template).toBeUndefined()
})

test('a built-in type starts a project with its icon and template; blank and saved types send only the key', () => {
  const video = projectStart('video')
  expect(video.project_type).toBe('video')
  expect(video.icon).toBe('🎬')
  expect(video.template).toBe(PROJECT_TYPES.find((t) => t.key === 'video')!.template)

  expect(projectStart('blank')).toEqual({ project_type: 'blank' })
  expect(projectStart('custom_7')).toEqual({ project_type: 'custom_7' })
})

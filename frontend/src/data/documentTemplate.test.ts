import { DOCUMENT_TEMPLATES } from './documentTemplate'
import { extractTitle } from './document'

type Node = { type: string; content?: Node[] }

test('every template starts with a heading that is its title', () => {
  for (const t of DOCUMENT_TEMPLATES) {
    expect(extractTitle(t.content)).toBe(t.title)
    expect((t.content as { content: Node[] }).content[0].type).toBe('heading')
  }
})

test('templates have unique ids and a task list', () => {
  expect(new Set(DOCUMENT_TEMPLATES.map((t) => t.id)).size).toBe(DOCUMENT_TEMPLATES.length)
  for (const t of DOCUMENT_TEMPLATES) {
    expect((t.content as { content: Node[] }).content.some((n) => n.type === 'workspaceTaskList')).toBe(true)
  }
})

test('the song template covers lyrics, credits, key/BPM, versions, ISRC and tasks', () => {
  const song = JSON.stringify(DOCUMENT_TEMPLATES.find((t) => t.id === 'song')!.content)
  for (const word of ['Lyrics', 'Credits', 'Key and BPM', 'Versions and stems', 'ISRC', 'Tasks']) expect(song).toContain(word)
})

test('the requirements template covers problem, goals, stories, acceptance criteria and scope', () => {
  const req = JSON.stringify(DOCUMENT_TEMPLATES.find((t) => t.id === 'requirements')!.content)
  for (const word of ['Problem', 'Goals', 'User stories', 'Acceptance criteria', 'Out of scope']) expect(req).toContain(word)
})

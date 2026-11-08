import { DOCUMENT_TEMPLATES, withTitle } from './documentTemplate'
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

test('the PRD template has its sections, with requirements and milestones as task lines', () => {
  const prd = DOCUMENT_TEMPLATES.find((t) => t.id === 'prd')!
  const json = JSON.stringify(prd.content)
  for (const word of ['Problem', 'Goals', 'Users', 'Requirements', 'Acceptance criteria', 'Out of scope', 'Milestones']) expect(json).toContain(word)
  const blocks = (prd.content as { content: Node[] }).content
  const headings = blocks.map((b, i) => [b, i] as const).filter(([b]) => b.type === 'heading')
  const after = (title: string) => blocks[headings.find(([b]) => JSON.stringify(b).includes(title))![1] + 1].type
  expect(after('Requirements')).toBe('workspaceTaskList')
  expect(after('Milestones')).toBe('workspaceTaskList')
  expect(after('Acceptance criteria')).toBe('bulletList')
})

test('withTitle keeps the sections and renames the title heading', () => {
  const song = DOCUMENT_TEMPLATES.find((t) => t.id === 'song')!
  const renamed = withTitle(song, 'Song 1')
  expect(renamed.title).toBe('Song 1')
  expect(extractTitle(renamed.content)).toBe('Song 1')
  expect(JSON.stringify(renamed.content)).toContain('Versions and stems')
  expect((renamed.content as { content: Node[] }).content).toHaveLength((song.content as { content: Node[] }).content.length)
  expect(extractTitle(song.content)).toBe('Untitled Song')
})

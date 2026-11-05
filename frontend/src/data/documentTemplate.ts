import { buildInitialContent } from '@/data/document'

type Json = Record<string, unknown>

export interface DocumentTemplate {
  id: string
  label: string
  title: string
  content: Json
}

const text = (value: string): Json => ({ type: 'text', text: value })
const heading = (level: number, value: string): Json => ({ type: 'heading', attrs: { level }, content: [text(value)] })
const paragraph = (value = ''): Json => (value ? { type: 'paragraph', content: [text(value)] } : { type: 'paragraph' })
const bullets = (items: string[]): Json => ({
  type: 'bulletList',
  content: items.map((item) => ({ type: 'listItem', content: [paragraph(item)] })),
})
// Task lines become Space tasks once the document is open (see document_task_lines.md).
const tasks = (items: string[]): Json => ({
  type: 'workspaceTaskList',
  content: items.map((item) => ({ type: 'workspaceTaskItem', content: [paragraph(item)] })),
})

function doc(title: string, blocks: Json[]): Json {
  const [titleHeading] = (buildInitialContent(title).content as Json[])
  return { type: 'doc', content: [titleHeading, ...blocks] }
}

export const REQUIREMENTS_TEMPLATE: DocumentTemplate = {
  id: 'requirements',
  label: 'Requirements Doc',
  title: 'Untitled Requirements',
  content: doc('Untitled Requirements', [
    heading(2, 'Problem'),
    paragraph('What is wrong or missing today, and for whom?'),
    heading(2, 'Goals'),
    bullets(['']),
    heading(2, 'User stories'),
    bullets(['As a …, I want …, so that …']),
    heading(2, 'Acceptance criteria'),
    bullets(['']),
    heading(2, 'Out of scope'),
    bullets(['']),
    heading(2, 'Tasks'),
    tasks(['']),
  ]),
}

export const SONG_TEMPLATE: DocumentTemplate = {
  id: 'song',
  label: 'Song',
  title: 'Untitled Song',
  content: doc('Untitled Song', [
    heading(2, 'Lyrics'),
    paragraph(),
    heading(2, 'Credits'),
    bullets(['Writers: ', 'Producers: ', 'Performers: ']),
    heading(2, 'Key and BPM'),
    paragraph('Key: · BPM:'),
    heading(2, 'Versions and stems'),
    bullets(['Demo', 'Mix', 'Master', 'Stems']),
    heading(2, 'Metadata'),
    bullets(['ISRC: ', 'Release date: ']),
    heading(2, 'Tasks'),
    tasks(['Write', 'Record', 'Mix', 'Master', 'Add credits and ISRC']),
  ]),
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [REQUIREMENTS_TEMPLATE, SONG_TEMPLATE]

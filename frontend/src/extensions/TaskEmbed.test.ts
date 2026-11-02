import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { DOMParser as ProseMirrorParser, DOMSerializer } from '@tiptap/pm/model'
import { TASK_EMBED_DEFAULTS } from '@/data/taskEmbed'
import { TaskEmbed } from './TaskEmbed'

const schema = getSchema([Document, Paragraph, Text, TaskEmbed])

const chosen = { view: 'gantt', scope: 'sprint', scopeId: 4, status: 'all' }

function render(attrs: Record<string, unknown>): HTMLElement {
  const doc = schema.nodeFromJSON({ type: 'doc', content: [{ type: 'taskEmbed', attrs }] })
  const container = document.createElement('div')
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content))
  return container
}

function parse(html: string) {
  const container = document.createElement('div')
  container.innerHTML = html
  return ProseMirrorParser.fromSchema(schema).parse(container).firstChild!
}

test('a task embed is a block atom with its four settings and the defaults of a new one', () => {
  expect(schema.nodes.taskEmbed.isBlock).toBe(true)
  expect(schema.nodes.taskEmbed.isAtom).toBe(true)
  expect(Object.keys(schema.nodes.taskEmbed.spec.attrs ?? {}).sort()).toEqual(['scope', 'scopeId', 'status', 'view'])
  expect(schema.nodeFromJSON({ type: 'taskEmbed' }).attrs).toEqual(TASK_EMBED_DEFAULTS)
})

test('the static HTML carries the settings and parses back to the same node', () => {
  const container = render(chosen)
  const element = container.querySelector('div[data-type="taskEmbed"]')!
  expect(element).toHaveAttribute('data-view', 'gantt')
  expect(element).toHaveAttribute('data-scope', 'sprint')
  expect(element).toHaveAttribute('data-scope-id', '4')
  expect(element).toHaveAttribute('data-status', 'all')

  const node = parse(container.innerHTML)
  expect(node.type.name).toBe('taskEmbed')
  expect(node.attrs).toEqual(chosen)
})

test('settings that are not ours fall back to the defaults when written and when read', () => {
  const bad = { view: 'kanban', scope: 'folder', scopeId: -1, status: 'blocked' }
  const element = render(bad).querySelector('div[data-type="taskEmbed"]')!
  expect(element).toHaveAttribute('data-view', 'list')
  expect(element).not.toHaveAttribute('data-scope-id')

  const node = parse('<div data-type="taskEmbed" data-view="kanban" data-scope="sprint" data-scope-id="abc" data-status="open"></div>')
  expect(node.attrs).toEqual({ view: 'list', scope: 'sprint', scopeId: null, status: 'open' })
})

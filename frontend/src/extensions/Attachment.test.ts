import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { DOMParser as ProseMirrorParser, DOMSerializer } from '@tiptap/pm/model'
import { AudioAttachment, FileAttachment } from './Attachment'

const schema = getSchema([Document, Paragraph, Text, AudioAttachment, FileAttachment])

const attrs = (extra: Record<string, unknown> = {}) => ({
  src: 'https://inertia.test/rails/active_storage/blobs/x/song.mp3',
  name: 'song.mp3',
  size: 2048,
  type: 'audio/mpeg',
  ...extra,
})

function render(nodeName: string, nodeAttrs: Record<string, unknown>): HTMLElement {
  const doc = schema.nodeFromJSON({ type: 'doc', content: [{ type: nodeName, attrs: nodeAttrs }] })
  const container = document.createElement('div')
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content))
  return container
}

function parse(html: string) {
  const container = document.createElement('div')
  container.innerHTML = html
  return ProseMirrorParser.fromSchema(schema).parse(container).firstChild!
}

test('audio and file attachments are block atoms', () => {
  for (const name of ['audio', 'fileAttachment']) {
    expect(schema.nodes[name].isBlock).toBe(true)
    expect(schema.nodes[name].isAtom).toBe(true)
    expect(Object.keys(schema.nodes[name].spec.attrs ?? {}).sort()).toEqual(['name', 'size', 'src', 'type'])
  }
})

test('an audio node is an audio element with controls that parses back with its attributes', () => {
  const container = render('audio', attrs())
  const audio = container.querySelector('audio')!
  expect(audio).toHaveAttribute('controls')
  expect(audio).toHaveAttribute('src', attrs().src)
  expect(audio).toHaveAttribute('data-name', 'song.mp3')

  const node = parse(container.innerHTML)
  expect(node.type.name).toBe('audio')
  expect(node.attrs).toEqual(attrs())
})

test('a file node is a download link that parses back with its attributes', () => {
  const file = attrs({ src: '/rails/active_storage/blobs/x/plan.pdf', name: 'plan.pdf', size: 90000, type: 'application/pdf' })
  const container = render('fileAttachment', file)
  const link = container.querySelector('div[data-type="fileAttachment"] a')!
  expect(link).toHaveAttribute('href', file.src)
  expect(link).toHaveAttribute('download', 'plan.pdf')
  expect(link.textContent).toBe('plan.pdf')

  const node = parse(container.innerHTML)
  expect(node.type.name).toBe('fileAttachment')
  expect(node.attrs).toEqual(file)
})

test('a source that could run script is never written into the HTML', () => {
  const bad = attrs({ src: 'javascript:alert(1)' })
  expect(render('audio', bad).querySelector('audio')).not.toHaveAttribute('src')
  expect(render('fileAttachment', bad).querySelector('a')).not.toHaveAttribute('href')
})

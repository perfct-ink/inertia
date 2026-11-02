import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import AttachmentView from '@/components/editors/AttachmentView'
import { attachmentAttrsFromElement, safeAttachmentUrl } from '@/data/attachment'

// Two block nodes for files embedded in a document: `audio` (an inline player)
// and `fileAttachment` (a card with name, type, size, preview and download).
// Images and video keep their own nodes (TiptapImage, Video). Both share the
// attributes below and the AttachmentView node view.
//
// KEEP IN SYNC with collab-server/src/schema.ts, which mirrors the node names
// and attributes: a node it doesn't know can't be saved in a shared document.

// `rendered: false`: renderHTML below writes the attributes itself.
const attachmentAttributes = {
  src: { default: null, rendered: false },
  name: { default: null, rendered: false },
  size: { default: null, rendered: false },
  type: { default: null, rendered: false },
}

function dataAttributes(attrs: Record<string, unknown>) {
  return { 'data-name': attrs.name, 'data-size': attrs.size, 'data-file-type': attrs.type }
}

// An audio file: <audio controls src> (the page's own markup for it).
export const AudioAttachment = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,

  addAttributes() {
    return attachmentAttributes
  },

  parseHTML() {
    return [{ tag: 'audio[src]', getAttrs: (element) => attachmentAttrsFromElement(element as HTMLElement) }]
  },

  renderHTML({ node }) {
    return ['audio', { controls: '', preload: 'metadata', src: safeAttachmentUrl(node.attrs.src), ...dataAttributes(node.attrs) }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView)
  },
})

// Any other file: a div holding a download link.
export const FileAttachment = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,

  addAttributes() {
    return attachmentAttributes
  },

  parseHTML() {
    return [{ tag: 'div[data-type="fileAttachment"]', getAttrs: (element) => attachmentAttrsFromElement(element as HTMLElement) }]
  },

  renderHTML({ node }) {
    const href = safeAttachmentUrl(node.attrs.src)
    return [
      'div',
      { 'data-type': 'fileAttachment', 'data-src': href, ...dataAttributes(node.attrs) },
      ['a', { href, download: node.attrs.name }, node.attrs.name || 'File'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView)
  },
})

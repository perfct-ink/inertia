import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TaskEmbedView from '@/components/editors/TaskEmbedView'
import { TASK_EMBED_DEFAULTS, normalizeTaskEmbed, taskEmbedAttrsFromElement, taskEmbedDataAttributes } from '@/data/taskEmbed'

// A live task list or Gantt in a document: a block atom that stores only what
// to show (view, scope, scope id, status filter) and reads the Space's tasks
// when it is drawn, so it is never out of date. See data/taskEmbed.ts for the
// rules and components/editors/TaskEmbedPanel.tsx for what it draws.
//
// KEEP IN SYNC with collab-server/src/schema.ts, which mirrors the node name,
// attributes and their defaults: a node it doesn't know can't be saved in a
// shared document, so the collab server must be deployed with this change.

export interface TaskEmbedOptions {
  // The document being edited, which the "This document" scope points at.
  documentId: number | null
}

export const TaskEmbed = Node.create<TaskEmbedOptions>({
  name: 'taskEmbed',
  group: 'block',
  atom: true,

  addOptions() {
    return { documentId: null }
  },

  // `rendered: false`: renderHTML below writes the attributes itself.
  addAttributes() {
    return {
      view: { default: TASK_EMBED_DEFAULTS.view, rendered: false },
      scope: { default: TASK_EMBED_DEFAULTS.scope, rendered: false },
      scopeId: { default: TASK_EMBED_DEFAULTS.scopeId, rendered: false },
      status: { default: TASK_EMBED_DEFAULTS.status, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="taskEmbed"]', getAttrs: (element) => ({ ...taskEmbedAttrsFromElement(element as HTMLElement) }) }]
  },

  // The static form (copy, export) is a labelled placeholder; the tasks are not
  // written into the HTML because they change.
  renderHTML({ node }) {
    return ['div', { 'data-type': 'taskEmbed', ...taskEmbedDataAttributes(normalizeTaskEmbed(node.attrs)) }, 'Live task list']
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskEmbedView)
  },
})

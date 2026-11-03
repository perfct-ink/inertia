import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import WorkspaceTaskItemView from '@/components/editors/WorkspaceTaskItemView'

// The task line as plain markup: its schema, with no controls and no calls to
// the API. A read-only page that anyone can open (a share link) uses this one,
// since the controls below talk to the signed-in person's tasks.
export const StaticWorkspaceTaskItem = Node.create({
  name: 'workspaceTaskItem',
  content: 'paragraph',
  defining: true,

  addAttributes() {
    return {
      taskId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'li[data-type="workspaceTaskItem"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes({ 'data-type': 'workspaceTaskItem' }, HTMLAttributes), 0]
  },
})

export const WorkspaceTaskItem = StaticWorkspaceTaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WorkspaceTaskItemView)
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
    }
  },
})

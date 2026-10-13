import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import WorkspaceTaskItemView from '@/components/editors/WorkspaceTaskItemView'

export const WorkspaceTaskItem = Node.create({
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

import { useMemo } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { normalizeTaskEmbed } from '@/data/taskEmbed'
import TaskEmbedPanel from './TaskEmbedPanel'

// The node view for the `taskEmbed` document node (see extensions/TaskEmbed.ts):
// the live list or Gantt, with its settings and a Remove button while editing.
// `data-type` keeps the embed visible when the page folds to tasks only.
export default function TaskEmbedView({ node, editor, extension, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const attrs = useMemo(() => normalizeTaskEmbed(node.attrs), [node.attrs])
  return (
    <NodeViewWrapper data-type="taskEmbed">
      <TaskEmbedPanel
        attrs={attrs}
        documentId={(extension.options.documentId as number | null) ?? null}
        editable={editor.isEditable}
        selected={selected}
        onChange={(next) => updateAttributes(next)}
        onRemove={deleteNode}
      />
    </NodeViewWrapper>
  )
}

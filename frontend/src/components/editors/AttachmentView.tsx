import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { AttachmentCard } from '@/components/ui'

// The node view for the `audio` and `fileAttachment` document nodes (see
// extensions/Attachment.ts): a card with the file's name, type and size, a
// player for audio, Preview and Download, and a Remove button while editing.
export default function AttachmentView({ node, editor, deleteNode, selected }: NodeViewProps) {
  const { src, name, size, type } = node.attrs as { src: string | null; name: string | null; size: number | null; type: string | null }
  return (
    <NodeViewWrapper>
      <AttachmentCard
        name={name || 'Untitled file'}
        url={src}
        type={type}
        size={size}
        player={node.type.name === 'audio'}
        selected={selected}
        onRemove={editor.isEditable ? deleteNode : undefined}
      />
    </NodeViewWrapper>
  )
}

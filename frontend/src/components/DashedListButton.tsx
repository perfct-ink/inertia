import type { Editor } from '@tiptap/react'
import DocumentToolbarButton from '@/components/DocumentToolbarButton'

// The same size and stroke as the other lucide icons beside it (lucide has no
// list with dashes): three short dashes, each followed by a line of text.
function DashedListIcon() {
  return (
    <svg
      className="document-toolbar_icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h3M10 6h11M3 12h3M10 12h11M3 18h3M10 18h11" />
    </svg>
  )
}

// The toolbar's "Dashed list" button: pressed while the cursor is in a dashed list.
// Like the bullet and numbered list buttons it makes a list, changes a list of
// another style, or takes the item out of a dashed list. The key for it is bound
// in extensions/DashedList.ts (LIST_SHORTCUTS), not here.
export default function DashedListButton({ editor }: { editor: Editor }) {
  return (
    <DocumentToolbarButton
      icon={<DashedListIcon />}
      onClick={() => editor.chain().focus().toggleDashedList().run()}
      active={editor.isActive('bulletList', { listStyle: 'dashed' })}
      title="Dashed list"
    />
  )
}

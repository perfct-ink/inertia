import type { Extensions } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import HardBreak from '@tiptap/extension-hard-break'
import { TextSelection } from '@tiptap/pm/state'
import { HeadingAnchor } from '@/extensions/HeadingAnchor'
import Video from '@/extensions/Video'
import { AudioAttachment, FileAttachment } from '@/extensions/Attachment'
import { WorkspaceTaskList } from '@/extensions/WorkspaceTaskList'
import { StaticWorkspaceTaskItem, WorkspaceTaskItem } from '@/extensions/WorkspaceTaskItem'

// Enforce: a document always starts with a heading followed by body content
const CustomDocument = TiptapDocument.extend({ content: 'heading block*' })

// The nodes and marks a document is made of. The editor (DocumentScreen) and
// the read-only page behind a share link both build on this list, so what one
// can show the other shows the same way. `readOnly` swaps the task line for
// its plain form: the editor's draws controls that read and change the
// signed-in person's tasks, which a visitor with a link has no business with.
export function documentSchema({ readOnly = false }: { readOnly?: boolean } = {}): Extensions {
  return [
    CustomDocument,
    Paragraph,
    Text,
    HardBreak,
    Bold,
    Italic,
    Underline,
    Strike,
    Code,
    HeadingAnchor.configure({ levels: [1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5 | 6)[] }),
    BulletList,
    OrderedList,
    ListItem,
    WorkspaceTaskList,
    readOnly ? StaticWorkspaceTaskItem : WorkspaceTaskItem,
    CodeBlock,
    HorizontalRule.extend({
      addCommands() {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHorizontalRule: () => ({ state, dispatch }: any) => {
            const { tr, selection: { $from } } = state
            const hr = state.schema.nodes.horizontalRule.create()
            const para = state.schema.nodes.paragraph.create()
            tr.replaceSelectionWith(hr)
            const pos = tr.mapping.map($from.pos) + hr.nodeSize
            tr.insert(pos, para)
            tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
            if (dispatch) dispatch(tr)
            return true
          },
        }
      },
    }),
    TiptapImage,
    Link.configure({ openOnClick: false }),
    Video,
    AudioAttachment,
    FileAttachment,
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
  ]
}

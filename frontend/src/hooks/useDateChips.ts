import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import { useCreateDocumentDate, useDeleteDocumentDate, useDocumentDates, useUpdateDocumentDate } from '@/api/documentDates'
import { dateIdsIn, dateLabel, documentDatePayload, removedDateIds } from '@/data/documentDate'
import type { DocumentDate } from '@/types'

// Everything the document screen does for date chips (docs/features/document_dates.md):
// adding one (typed or from the toolbar), and asking what to do with the calendar
// entry when a line with a date is deleted. The screen creates the editor after
// this hook, so it is given the editor through a ref.
export function useDateChips(docId: number, docTitle: string, editorRef: MutableRefObject<Editor | null>) {
  const { data: docDates = [] } = useDocumentDates({ document_id: docId })
  const createDate = useCreateDocumentDate()
  const updateDate = useUpdateDocumentDate()
  const deleteDate = useDeleteDocumentDate()
  // The "Add a date" dialog (null when closed): the day typed, if any, and the line it is on.
  const [adding, setAdding] = useState<{ date: string | null; line: string } | null>(null)
  // Calendar entries whose chip was deleted and which are waiting for an answer.
  const [removed, setRemoved] = useState<DocumentDate[]>([])
  // Always-current values for the callbacks the editor keeps from when it was made.
  const datesRef = useRef(docDates)
  datesRef.current = docDates
  const titleRef = useRef(docTitle)
  titleRef.current = docTitle
  // The chips there were before the person's first edit since the last check, or
  // null when they have not edited since.
  const chipsBeforeEditsRef = useRef<Set<number> | null>(null)

  const create = (date: string, label: string) => {
    createDate.mutate(documentDatePayload(date, label, docId), {
      onSuccess: (entry) => {
        setAdding(null)
        const editor = editorRef.current
        if (editor && !editor.isDestroyed) editor.chain().focus().insertDocumentDate(entry.id).run()
      },
    })
  }
  const createRef = useRef(create)
  createRef.current = create

  // A typed day makes the chip straight away; "/date " and "@date " ask for the day.
  const onTrigger = useCallback((date: string | null, line: string) => {
    if (date) createRef.current(date, dateLabel(line, titleRef.current))
    else setAdding({ date: null, line })
  }, [])

  // The toolbar button: ask for a day, labelled with the line the cursor is on.
  const openDialog = useCallback(() => {
    const line = editorRef.current?.state.selection.$from.parent.textContent ?? ''
    setAdding({ date: null, line })
  }, [editorRef])

  // Called for every change the person makes (not for content arriving from
  // collaborators): remembers which chips there were before the first one.
  const noteEdit = useCallback((transaction: Transaction) => {
    if (chipsBeforeEditsRef.current === null) chipsBeforeEditsRef.current = dateIdsIn(transaction.before)
  }, [])

  // Called once edits have settled (after a save, like the task lines): chips that
  // are gone and whose entry is still linked to this document are asked about.
  // Comparing after the pause means a line moved by cut and paste is not.
  const checkRemoved = useCallback(() => {
    const editor = editorRef.current
    const before = chipsBeforeEditsRef.current
    if (!editor || editor.isDestroyed || before === null) return
    chipsBeforeEditsRef.current = null
    const linked = new Map(datesRef.current.map((d) => [d.id, d]))
    const gone = removedDateIds(before, dateIdsIn(editor.state.doc), new Set(linked.keys()))
    if (gone.length > 0) setRemoved((queue) => [...queue, ...gone.map((id) => linked.get(id) as DocumentDate)])
  }, [editorRef])

  // Keep: the entry stays on the calendar, no longer linked to the document.
  const keepRemoved = () => {
    removed.forEach((entry) => updateDate.mutate({ id: entry.id, document_id: null }))
    setRemoved([])
  }
  const deleteRemoved = () => {
    removed.forEach((entry) => deleteDate.mutate(entry.id))
    setRemoved([])
  }

  return {
    onTrigger,
    openDialog,
    noteEdit,
    checkRemoved,
    // Props for DocumentDateDialog and DocumentDateRemovedDialog.
    addDialog: {
      open: adding !== null,
      defaultDate: adding?.date,
      defaultLabel: dateLabel(adding?.line ?? '', docTitle),
      pending: createDate.isPending,
      onSubmit: ({ date, label }: { date: string; label: string }) => create(date, label),
      onClose: () => { setAdding(null); editorRef.current?.commands.focus() },
    },
    removedDialog: { dates: removed, onKeep: keepRemoved, onDelete: deleteRemoved },
  }
}

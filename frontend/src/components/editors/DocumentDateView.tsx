import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { isAxiosError } from 'axios'
import { CalendarDays, Loader2 } from 'lucide-react'
import { Button, DatePicker } from '@/components/ui'
import { useDocumentDate, useUpdateDocumentDate } from '@/api/documentDates'
import { dateEntryTitle } from '@/data/documentDate'
import './DocumentDateView.scss'

// A date picked or typed in the document, as a chip: its current day, editable
// right here. The change is made to the calendar's entry, and a change made on
// the calendar shows up here, because the chip stores only the entry's id. A
// failed save raises the usual error notice and the chip keeps what the server
// has.
export default function DocumentDateView({ node }: NodeViewProps) {
  const dateId = (node.attrs.dateId as number | null) ?? 0
  const { data: entry, error, isError, refetch } = useDocumentDate(dateId)
  const updateDate = useUpdateDocumentDate()

  if (!entry) {
    const gone = !dateId || (isError && isAxiosError(error) && error.response?.status === 404)
    return (
      <NodeViewWrapper as="span" className="view-document_date" contentEditable={false} data-date-id={dateId || undefined}>
        {gone || isError ? (
          <>
            <span className="document_date-missing">{gone ? 'Deleted date' : 'Couldn’t load the date'}</span>
            {!gone && <Button variant="ghost" className="document_date-retry" onClick={() => refetch()}>Retry</Button>}
          </>
        ) : (
          <span className="document_date-missing" role="status">
            <Loader2 className="document_date-icon document_date-icon--spinning" aria-hidden="true" />
            Loading date
          </span>
        )}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="span" className="view-document_date" contentEditable={false} data-date-id={dateId} title="On the calendar">
      <CalendarDays className="document_date-icon" aria-hidden="true" />
      <DatePicker
        aria-label={`Date: ${dateEntryTitle(entry)}`}
        value={entry.date}
        className="document_date-field"
        onChange={(e) => e.target.value && e.target.value !== entry.date && updateDate.mutate({ id: entry.id, date: e.target.value })}
      />
    </NodeViewWrapper>
  )
}

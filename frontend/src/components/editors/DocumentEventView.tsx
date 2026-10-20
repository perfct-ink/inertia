import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui'
import { useEvents, useUpdateEvent } from '@/api/events'
import './DocumentEventView.scss'

// The event's current title with its date, which can be changed right here;
// either way the calendar's event is the one that changes.
export default function DocumentEventView({ node }: NodeViewProps) {
  const { data: events } = useEvents()
  const updateEvent = useUpdateEvent()
  const eventId = node.attrs.eventId as number | null
  const event = events?.find((e) => e.id === eventId)

  return (
    <NodeViewWrapper as="span" className="document_event" contentEditable={false}>
      <CalendarDays className="document_event-icon" aria-hidden="true" />
      {event ? (
        <>
          <span className="document_event-title">{event.title}</span>
          <Input
            type="date"
            aria-label={`Date of ${event.title}`}
            value={event.date}
            title={format(parseISO(event.date), 'EEEE, MMM d, yyyy')}
            onChange={(e) => e.target.value && updateEvent.mutate({ id: event.id, date: e.target.value })}
            className="document_event-date"
          />
        </>
      ) : (
        <span className="document_event-missing">{events ? 'Deleted event' : 'Loading…'}</span>
      )}
    </NodeViewWrapper>
  )
}

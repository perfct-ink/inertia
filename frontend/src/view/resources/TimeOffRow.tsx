import { Input } from '@/components/ui'
import { useDeleteTimeOff, useUpdateTimeOff } from '@/api/timeOffs'
import { spanPeriod } from '@/data/resource'
import type { TimeOff } from '@/types'
import SpanRow from './SpanRow'

// One person's leave. Admins and owners change its dates and note and remove
// it in place; everyone else reads it (the note is not sent to them).
export default function TimeOffRow({ timeOff, person, canManage }: { timeOff: TimeOff; person: string; canManage: boolean }) {
  const update = useUpdateTimeOff()
  const remove = useDeleteTimeOff()
  const label = `${person}, ${spanPeriod(timeOff)}`

  function commitNote(text: string, restore: () => void) {
    const note = text.trim()
    if (note !== (timeOff.note ?? '')) update.mutate({ id: timeOff.id, note: note || null }, { onError: restore })
  }

  return (
    <SpanRow
      label={label}
      heading={<span className="resources-span-title">{person}</span>}
      start={timeOff.start_date}
      end={timeOff.end_date}
      canManage={canManage}
      onSave={(changes, onError) => update.mutate({ id: timeOff.id, ...changes }, { onError })}
      onRemove={() => remove.mutate(timeOff.id)}
    >
      <NoteField key={`note-${timeOff.note}`} label={label} note={timeOff.note ?? ''} onCommit={commitNote} />
    </SpanRow>
  )
}

// Saves when the field loses focus; a failed save puts the saved note back.
function NoteField({ label, note, onCommit }: { label: string; note: string; onCommit: (note: string, restore: () => void) => void }) {
  return (
    <label className="resources-field resources-field--note">
      <span>Note</span>
      <Input
        aria-label={`Note for ${label}`}
        maxLength={255}
        defaultValue={note}
        onBlur={(e) => onCommit(e.target.value, () => { e.target.value = note })}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    </label>
  )
}

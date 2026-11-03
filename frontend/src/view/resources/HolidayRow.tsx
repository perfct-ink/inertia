import { useState } from 'react'
import { FormError, Input } from '@/components/ui'
import { useDeleteHoliday, useUpdateHoliday } from '@/api/holidays'
import { spanPeriod } from '@/data/resource'
import type { Holiday } from '@/types'
import SpanRow from './SpanRow'

// One holiday in the Space's list. Admins and owners rename it, change its
// dates and remove it in place; everyone else reads it.
export default function HolidayRow({ holiday, canManage }: { holiday: Holiday; canManage: boolean }) {
  const update = useUpdateHoliday()
  const remove = useDeleteHoliday()
  const [error, setError] = useState('')
  // Bumping this remounts the name field with the saved name after a refused change.
  const [version, setVersion] = useState(0)
  const restore = () => setVersion((v) => v + 1)

  function commitName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a name for the holiday.')
      restore()
      return
    }
    setError('')
    if (trimmed !== holiday.name) update.mutate({ id: holiday.id, name: trimmed }, { onError: restore })
  }

  return (
    <SpanRow
      label={`${holiday.name}, ${spanPeriod(holiday)}`}
      heading={canManage ? (
        <div className="resources-span-name">
          <Input
            key={`name-${holiday.name}-${version}`}
            aria-label={`Name of ${holiday.name}`}
            maxLength={255}
            defaultValue={holiday.name}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
          <FormError message={error} />
        </div>
      ) : <span className="resources-span-title">{holiday.name}</span>}
      start={holiday.start_date}
      end={holiday.end_date}
      canManage={canManage}
      onSave={(changes, onError) => update.mutate({ id: holiday.id, ...changes }, { onError })}
      onRemove={() => remove.mutate(holiday.id)}
    />
  )
}

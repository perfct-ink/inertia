import type { ReactNode } from 'react'
import { autoFields, type AutoFieldSource } from '@/data/task'
import './TaskAutoFields.scss'

// A time as "2 days ago" with the exact date and time on hover.
function When({ iso, text }: { iso: string; text: string }) {
  return <time dateTime={iso} title={new Date(iso).toLocaleString()}>{text}</time>
}

// The read-only fields the server fills in on a task: item ID, who created it
// and when, and when it last changed. Nothing here can be edited, and what the
// server doesn't know (older tasks have no creator) is left out.
export function TaskAutoFields({ task, now }: { task: AutoFieldSource; now?: Date }) {
  const { itemId, createdBy, created, updated } = autoFields(task, now)
  const rows: [string, ReactNode][] = [
    ['Item ID', itemId],
    ['Created by', createdBy],
    ['Created', created && task.created_at && <When iso={task.created_at} text={created} />],
    ['Last updated', updated && task.updated_at && <When iso={task.updated_at} text={updated} />],
  ]
  return (
    <dl className="task_auto_fields" aria-label="Automatic fields">
      {rows.filter(([, value]) => value).map(([label, value]) => (
        <div key={label} className="task_auto_fields-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

import type { TaskStatusColor } from '@/types'
import { classNames } from './classNames'
import './StatusDot.scss'

// The coloured dot beside a task status; the colour is one of the board's
// configurable status colours. Decorative: the status name is always beside
// it (or in `title`).
export function StatusDot({ color, title, className }: { color: TaskStatusColor; title?: string; className?: string }) {
  return <span aria-hidden="true" title={title} className={classNames('ui-status_dot', `ui-status_dot--${color}`, className)} />
}

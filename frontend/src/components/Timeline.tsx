import {
  format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInCalendarDays,
} from 'date-fns'
import './Timeline.scss'
import { donePercent, type Scheduled } from '@/data/schedule'

// Shared by EpicsPage, InitiativesPage, and FolderDetailPage's per-folder
// Gantt tab — all three are "a title, an optional start/target date, and a
// tasks_count/done_tasks_count rollup," so one renderer covers all of them
// instead of near-identical copies drifting apart.
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="timeline-progress">
      <div className="timeline-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

type Dated = Scheduled & { start_date: string; target_date: string }

// Read-only: dates are edited from each page's own List view inputs. Only
// items with both a start and target date can be placed on the month grid;
// the rest are named below it instead of silently dropped. No charting
// library — plain CSS percentages against a computed day range.
export function Timeline({ items }: { items: Scheduled[] }) {
  const dated = items.filter((e): e is Dated => Boolean(e.start_date && e.target_date))
  const undated = items.filter((e) => !e.start_date || !e.target_date)

  if (dated.length === 0) {
    return (
      <div className="view-timeline view-timeline--empty">
        <p>Set a start and target date to see it here</p>
      </div>
    )
  }

  const rangeStart = startOfMonth(new Date(Math.min(...dated.map((e) => parseISO(e.start_date).getTime()))))
  const rangeEnd = endOfMonth(new Date(Math.max(...dated.map((e) => parseISO(e.target_date).getTime()))))
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  return (
    <div className="view-timeline">
      <div className="timeline-chart">
        <div className="timeline-months">
          {months.map((m) => {
            const daysInMonth = differenceInCalendarDays(endOfMonth(m), startOfMonth(m)) + 1
            return (
              <div
                key={m.toISOString()}
                style={{ width: `${(daysInMonth / totalDays) * 100}%` }}
                className="timeline-month"
              >
                {format(m, 'MMM yyyy')}
              </div>
            )
          })}
        </div>
        <div className="timeline-rows">
          {dated.map((item) => {
            const s = parseISO(item.start_date)
            const e = parseISO(item.target_date)
            const offsetPct = (differenceInCalendarDays(s, rangeStart) / totalDays) * 100
            const widthPct = Math.max(((differenceInCalendarDays(e, s) + 1) / totalDays) * 100, 1.5)
            const percent = donePercent(item)
            return (
              <div key={item.id} className="timeline-row">
                <span className="timeline-title" title={item.title}>{item.title}</span>
                <div className="timeline-track">
                  <div
                    className="timeline-bar"
                    style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                    title={`${item.start_date} → ${item.target_date}`}
                  >
                    <div className="timeline-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className="timeline-count">
                  {item.done_tasks_count}/{item.tasks_count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="timeline-undated">
          Not shown (missing a start or target date): {undated.map((e) => e.title).join(', ')}
        </p>
      )}
    </div>
  )
}

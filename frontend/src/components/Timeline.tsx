import {
  format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInCalendarDays,
} from 'date-fns'

// Shared by EpicsPage, InitiativesPage, and FolderDetailPage's per-folder
// Gantt tab — all three are "a title, an optional start/target date, and a
// tasks_count/done_tasks_count rollup," so one renderer covers all of them
// instead of near-identical copies drifting apart.
export interface Scheduled {
  id: number
  title: string
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function donePercent(item: Scheduled) {
  return item.tasks_count > 0 ? Math.round((item.done_tasks_count / item.tasks_count) * 100) : 0
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
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-12">
        <p className="text-sm">Set a start and target date to see it here</p>
      </div>
    )
  }

  const rangeStart = startOfMonth(new Date(Math.min(...dated.map((e) => parseISO(e.start_date).getTime()))))
  const rangeEnd = endOfMonth(new Date(Math.max(...dated.map((e) => parseISO(e.target_date).getTime()))))
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  return (
    <div className="overflow-auto">
      <div className="min-w-[700px] max-w-4xl">
        <div className="flex border-b mb-3">
          {months.map((m) => {
            const daysInMonth = differenceInCalendarDays(endOfMonth(m), startOfMonth(m)) + 1
            return (
              <div
                key={m.toISOString()}
                style={{ width: `${(daysInMonth / totalDays) * 100}%` }}
                className="text-xs text-muted-foreground font-medium pb-1 shrink-0 truncate"
              >
                {format(m, 'MMM yyyy')}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          {dated.map((item) => {
            const s = parseISO(item.start_date)
            const e = parseISO(item.target_date)
            const offsetPct = (differenceInCalendarDays(s, rangeStart) / totalDays) * 100
            const widthPct = Math.max(((differenceInCalendarDays(e, s) + 1) / totalDays) * 100, 1.5)
            const percent = donePercent(item)
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-36 text-sm truncate shrink-0" title={item.title}>{item.title}</span>
                <div className="flex-1 relative h-6">
                  <div
                    className="absolute h-6 rounded-md bg-primary/20 border border-primary overflow-hidden"
                    style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                    title={`${item.start_date} → ${item.target_date}`}
                  >
                    <div className="h-full bg-primary/50" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className="w-14 text-xs text-muted-foreground text-right shrink-0">
                  {item.done_tasks_count}/{item.tasks_count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="text-xs text-muted-foreground mt-6">
          Not shown (missing a start or target date): {undated.map((e) => e.title).join(', ')}
        </p>
      )}
    </div>
  )
}

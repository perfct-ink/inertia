import { useEffect, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui'
import { useStartTimer, useStopTimer } from '@/api/timeEntries'
import { elapsedClock, formatMinutes } from '@/data/task'
import type { Task } from '@/types'

// Start/stop timer and the time logged so far, on a task card.
export function TaskTimer({ task }: { task: Task }) {
  const start = useStartTimer()
  const stop = useStopTimer()
  const [now, setNow] = useState(() => new Date())
  const running = !!task.timer_started_at && !!task.timer_entry_id

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const logged = task.logged_minutes ?? 0
  return (
    <div className="tasks-timer">
      <Button
        onClick={() => (running ? stop.mutate(task.timer_entry_id as number) : start.mutate(task.id))}
        disabled={start.isPending || stop.isPending}
        aria-label={running ? `Stop timer on ${task.title}` : `Start timer on ${task.title}`}
        className="tasks-next"
      >
        {running ? <Square className="tasks-icon" aria-hidden="true" /> : <Play className="tasks-icon" aria-hidden="true" />}
      </Button>
      <span className="tasks-timer_text">
        {running ? elapsedClock(task.timer_started_at as string, now) : logged > 0 ? formatMinutes(logged) : 'No time logged'}
        {running && logged > 0 && ` · ${formatMinutes(logged)} logged`}
      </span>
    </div>
  )
}

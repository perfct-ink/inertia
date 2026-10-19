import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { HealthBadge } from '@/components/ui'
import { ProgressBar, Timeline } from '@/components/Timeline'
import { roadmapLanes, roadmapRange } from '@/data/roadmap'
import type { Epic, Initiative, Milestone } from '@/types'

// Milestone lanes on one shared month axis. Used by the Roadmap page and by
// the public read-only roadmap link, so both draw the same chart.
export default function RoadmapTimeline({ milestones, initiatives, epics }: { milestones: Milestone[]; initiatives: Initiative[]; epics: Epic[] }) {
  const lanes = useMemo(() => roadmapLanes(milestones, initiatives, epics), [milestones, initiatives, epics])
  const range = useMemo(() => roadmapRange(lanes) ?? undefined, [lanes])

  return (
    <div className="roadmap-lanes">
      {lanes.map((lane) => (
        <section key={lane.key} className="roadmap-lane" aria-label={lane.milestone?.title ?? 'No milestone'}>
          <header className="roadmap-lane-header">
            <h2 className="roadmap-lane-title">{lane.milestone?.title ?? 'No milestone'}</h2>
            {lane.milestone?.target_date && (
              <span className="roadmap-lane-date">{format(parseISO(lane.milestone.target_date), 'MMM d, yyyy')}</span>
            )}
            {lane.milestone && <HealthBadge health={lane.milestone.health} />}
            {lane.milestone && (
              <div className="roadmap-lane-progress">
                <ProgressBar percent={lane.milestone.percent} />
                <span className="roadmap-lane-percent">{lane.milestone.percent}%</span>
              </div>
            )}
          </header>
          {lane.rows.length === 0
            ? <p className="roadmap-lane-empty">Nothing planned under this milestone yet.</p>
            : (
              <Timeline
                items={lane.rows}
                range={range}
                milestones={lane.milestone?.target_date ? [{ id: lane.milestone.id, title: lane.milestone.title, target_date: lane.milestone.target_date }] : []}
              />
            )}
        </section>
      ))}
    </div>
  )
}

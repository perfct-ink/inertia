import { Link } from 'react-router-dom'
import { allocationPeriod, formatHours, weekLabel } from '@/data/resource'
import type { PersonLoad, ProjectLoad } from '@/data/resource'
import { usePaths } from '@/hooks/usePaths'

type ProjectCardProps = {
  project: ProjectLoad
  name: string
  // Used to name the people allocated to the project.
  people: PersonLoad[]
}

// One project: the hours allocated to it in each visible week and who is on it.
export default function ProjectCard({ project, name, people }: ProjectCardProps) {
  const paths = usePaths()
  const personName = (userId: number) => people.find((p) => p.userId === userId)?.name ?? 'Former member'
  return (
    <section className="resources-card" aria-labelledby={`resources-project-${project.folderId}`}>
      <div className="resources-card-top">
        <h2 id={`resources-project-${project.folderId}`} className="resources-card-title">
          <Link to={paths.folder(project.folderId)} className="resources-link">{name}</Link>
        </h2>
      </div>

      <ul className="resources-weeks" aria-label={`Hours per week on ${name}, by week starting Monday`}>
        {project.weeks.map((week) => (
          <li key={week.week} className="resources-week">
            <span className="resources-week-label">{weekLabel(week.week)}</span>
            <span className="resources-week-hours">{formatHours(week.hours)} h</span>
            <span className="resources-week-note">{week.people === 0 ? 'No one' : `${week.people} ${week.people === 1 ? 'person' : 'people'}`}</span>
          </li>
        ))}
      </ul>

      <ul className="resources-allocations" aria-label={`People on ${name}`}>
        {project.allocations.map((allocation) => (
          <li key={allocation.id} className="resources-allocation">
            <span className="resources-allocation-project">{personName(allocation.user_id)}</span>
            <span className="resources-allocation-period">{formatHours(allocation.hours_per_week)} h/week &middot; {allocationPeriod(allocation)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

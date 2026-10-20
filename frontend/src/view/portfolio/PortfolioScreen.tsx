import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowDown, ArrowUp, Briefcase, Loader2 } from 'lucide-react'
import { Button, HealthBadge } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { usePortfolio } from '@/api/portfolio'
import { projectStatusLabel, sortPortfolio, type PortfolioSortKey } from '@/data/project'
import { usePageTitle } from '@/hooks/usePageTitle'
import '../planning/PlanningScreen.scss'
import './PortfolioScreen.scss'

const COLUMNS: { key: PortfolioSortKey; label: string }[] = [
  { key: 'name', label: 'Project' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'target_date', label: 'Dates' },
  { key: 'percent', label: 'Progress' },
]

const date = (value: string | null) => (value ? format(parseISO(value), 'MMM d, yyyy') : '')

// Every project in the Space in one table: owner, status, dates, progress and
// health. Click a column to sort. Details are edited on the Projects page.
export default function PortfolioScreen() {
  usePageTitle('Portfolio')
  const { data: rows = [], isLoading } = usePortfolio()
  const [sortKey, setSortKey] = useState<PortfolioSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const sorted = sortPortfolio(rows, sortKey, sortDir)

  function sortBy(key: PortfolioSortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-portfolio">
        <div className="planning-header">
          <h1 className="planning-title">Portfolio</h1>
          <Link to="/projects" className="planning-initiative">Edit project details</Link>
        </div>
        <div className="planning-body">
          {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
          {!isLoading && rows.length === 0 && (
            <div className="planning-empty">
              <Briefcase className="planning-empty_icon" aria-hidden="true" />
              <p>No projects yet. Make a folder a project to see it here.</p>
            </div>
          )}
          {rows.length > 0 && (
            <table className="portfolio-table">
              <thead>
                <tr>
                  {COLUMNS.map(({ key, label }) => (
                    <th key={key} scope="col" aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button variant="unstyled" onClick={() => sortBy(key)}>
                        {label}
                        {sortKey === key && (sortDir === 'asc' ? <ArrowUp className="portfolio-sort" aria-hidden="true" /> : <ArrowDown className="portfolio-sort" aria-hidden="true" />)}
                      </Button>
                    </th>
                  ))}
                  <th scope="col">Health</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id}>
                    <th scope="row"><Link to={`/folders/${row.id}?view=overview`}>{row.name}</Link></th>
                    <td>{row.owner_name ?? 'No owner'}</td>
                    <td>{projectStatusLabel(row.project_status)}</td>
                    <td>{row.start_date || row.target_date ? `${date(row.start_date)} → ${date(row.target_date)}` : ''}</td>
                    <td>
                      <div className="portfolio-progress">
                        <ProgressBar percent={row.percent} />
                        <span>{row.done_tasks_count}/{row.tasks_count}</span>
                      </div>
                    </td>
                    <td><HealthBadge health={row.health} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

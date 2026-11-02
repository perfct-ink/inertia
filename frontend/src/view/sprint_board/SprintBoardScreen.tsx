import { Link, Navigate } from 'react-router-dom'
import { Loader2, Rocket } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useSprints } from '@/api/sprints'
import { activeSprint, sprintBoardPath } from '@/data/sprint'
import { usePageTitle } from '@/hooks/usePageTitle'
import '../planning/PlanningScreen.scss'

// /sprint-board opens the Space's active sprint on the Workboard. With no
// active sprint it asks you to start one instead of showing an empty board.
export default function SprintBoardScreen() {
  usePageTitle('Sprint board')
  const { data: sprints = [], isLoading } = useSprints()
  const active = activeSprint(sprints)

  if (active) return <Navigate to={sprintBoardPath(active.id)} replace />

  return (
    <WorkspaceLayout>
      <div className="view-planning view-sprint_board">
        <div className="planning-body">
          {isLoading
            ? <Loader2 className="planning-spinner" aria-label="Loading" />
            : (
              <div className="planning-empty">
                <Rocket className="planning-empty_icon" aria-hidden="true" />
                <p>No sprint is active. Pick a sprint to start, or create one, then open its board.</p>
                <Link to="/sprints" className="planning-initiative">Go to sprints</Link>
              </div>
            )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

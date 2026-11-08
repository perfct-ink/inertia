import { Link } from 'react-router-dom'
import { ListFilter } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import { ProgressBar } from '@/components/Timeline'
import { useEpics } from '@/api/epics'
import { FEATURE_STATUS_LABEL, epicFeatureStatus } from '@/data/feature'
import { donePercent } from '@/data/schedule'
import type { Document } from '@/types'
import './FeatureProgress.scss'

// Above a feature's requirements document: the feature's name, its status and
// how many of its tasks are done, with the toggle that folds the document down
// to just its tasks. Nothing for any other document. Progress is hidden until
// the feature has a task. It follows the tasks without a reload (task changes
// refresh the epics).
export default function FeatureProgress({ doc, tasksOnly, onToggleTasksOnly }: {
  doc: Pick<Document, 'id' | 'doc_type'>
  tasksOnly: boolean
  onToggleTasksOnly: () => void
}) {
  const { data: epics = [] } = useEpics()
  const feature = doc.doc_type === 'document' ? epics.find((epic) => epic.document_id === doc.id) : undefined
  if (!feature) return null

  const status = epicFeatureStatus(feature)
  return (
    <section className="feature_progress" aria-label="Feature progress">
      <Link to={`/plan?epic_id=${feature.id}`} className="feature_progress-name" title="Plan this feature">{feature.title}</Link>
      <span className={classNames('feature_progress-status', `feature_progress-status--${status}`)}>{FEATURE_STATUS_LABEL[status]}</span>
      {feature.tasks_count > 0 && (
        <div className="feature_progress-bar">
          <ProgressBar percent={donePercent(feature)} />
          <span className="feature_progress-count">{feature.done_tasks_count} of {feature.tasks_count} tasks done</span>
        </div>
      )}
      <Button variant="secondary" aria-pressed={tasksOnly} onClick={onToggleTasksOnly} className="feature_progress-toggle">
        <ListFilter className="feature_progress-icon" aria-hidden="true" />
        Tasks only
      </Button>
    </section>
  )
}

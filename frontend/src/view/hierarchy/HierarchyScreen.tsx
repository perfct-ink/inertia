import { useMemo, useState, type ComponentType } from 'react'
import { ChevronRight, Milestone as MilestoneIcon, Flag, Target, CheckSquare, Loader2 } from 'lucide-react'
import { classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { donePercent } from '@/data/schedule'
import { buildHierarchy, type HierarchyNode, type HierarchyKind } from '@/data/hierarchy'
import { useMilestones } from '@/api/milestones'
import { useInitiatives } from '@/api/initiatives'
import { useEpics } from '@/api/epics'
import { useTasks } from '@/api/tasks'
import { usePageTitle } from '@/hooks/usePageTitle'
import './HierarchyScreen.scss'

const KIND_ICON: Record<HierarchyKind, ComponentType<{ className?: string }>> = {
  milestone: MilestoneIcon,
  initiative: Flag,
  epic: Target,
  task: CheckSquare,
}

function HierarchyRow({ node, depth, expanded, onToggle }: {
  node: HierarchyNode
  depth: number
  expanded: Set<string>
  onToggle: (key: string) => void
}) {
  const Icon = KIND_ICON[node.kind]
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.key)

  return (
    <div className="hierarchy-node">
      <div className="hierarchy-row" style={{ paddingLeft: `${depth * 20}px` }}>
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.key)}
            className="hierarchy-toggle"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={classNames('hierarchy-chevron', isOpen && 'hierarchy-chevron--open')} />
          </button>
        ) : (
          <span className="hierarchy-toggle_spacer" />
        )}
        <Icon className="hierarchy-icon" aria-hidden="true" />
        <span className="hierarchy-title" title={node.title}>{node.title}</span>
        <div className="hierarchy-progress">
          <ProgressBar percent={donePercent({ tasks_count: node.tasksCount, done_tasks_count: node.doneTasksCount })} />
        </div>
        <span className="hierarchy-count">{node.doneTasksCount}/{node.tasksCount}</span>
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <HierarchyRow key={child.key} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  )
}

export default function HierarchyScreen() {
  usePageTitle('Hierarchy')
  const { data: milestones = [], isLoading: loadingMilestones } = useMilestones()
  const { data: initiatives = [], isLoading: loadingInitiatives } = useInitiatives()
  const { data: epics = [], isLoading: loadingEpics } = useEpics()
  const { data: tasks = [], isLoading: loadingTasks } = useTasks()
  const isLoading = loadingMilestones || loadingInitiatives || loadingEpics || loadingTasks

  const { tree, unassigned } = useMemo(
    () => buildHierarchy(milestones, initiatives, epics, tasks),
    [milestones, initiatives, epics, tasks],
  )

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <WorkspaceLayout>
      <div className="view-hierarchy">
        <div className="hierarchy-header">
          <h1 className="hierarchy-heading">Hierarchy</h1>
        </div>
        <div className="hierarchy-body">
          <div className="hierarchy-tree">
            {isLoading && (
              <div className="hierarchy-loading">
                <Loader2 className="hierarchy-spinner" aria-label="Loading" />
              </div>
            )}

            {!isLoading && tree.length === 0 && unassigned.length === 0 && (
              <p className="hierarchy-empty">Nothing here yet.</p>
            )}

            {!isLoading && tree.map((node) => (
              <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} onToggle={toggle} />
            ))}

            {!isLoading && unassigned.length > 0 && (
              <>
                <div className="hierarchy-section_label">Unassigned</div>
                {unassigned.map((node) => (
                  <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} onToggle={toggle} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

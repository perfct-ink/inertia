import { useState } from 'react'
import { Loader2, Network, Plus, X } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useCreateIoNode, useDeleteIoNode, useIoNodes, useUpdateIoNode } from '@/api/ioNodes'
import { useObjectives } from '@/api/objectives'
import { useInitiatives } from '@/api/initiatives'
import { IO_CHILD_LABEL, IO_KIND_LABEL, buildIoTree, linkChange, linkValue, type IoTreeNode } from '@/data/ioMap'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Initiative, Objective } from '@/types'
import './IoMapScreen.scss'

// Intermediate Objectives Map: the goal at the top, 3 to 5 critical success
// factors under it, and the necessary conditions under those, each optionally
// tied to an OKR objective or an initiative whose progress it shows.
export default function IoMapScreen() {
  usePageTitle('Objectives map')
  const { data: nodes = [], isLoading } = useIoNodes()
  const { data: objectives = [] } = useObjectives()
  const { data: initiatives = [] } = useInitiatives()
  const createNode = useCreateIoNode()
  const [goalTitle, setGoalTitle] = useState('')
  const tree = buildIoTree(nodes)

  function addGoal() {
    const title = goalTitle.trim()
    if (title) createNode.mutate({ title }, { onSuccess: () => setGoalTitle('') })
  }

  return (
    <WorkspaceLayout>
      <div className="view-io_map">
        <h1 className="io_map-title">Objectives map</h1>
        {isLoading && <Loader2 className="io_map-spinner" aria-label="Loading" />}
        {!isLoading && tree.length === 0 && (
          <div className="io_map-empty">
            <Network className="io_map-empty_icon" aria-hidden="true" />
            <p>Start with the one goal everything else serves. Critical success factors and necessary conditions go underneath it.</p>
            <div className="io_map-add">
              <Input aria-label="Goal" placeholder="Goal" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addGoal() }} />
              <Button variant="primary" onClick={addGoal} disabled={!goalTitle.trim()}>Add goal</Button>
            </div>
          </div>
        )}
        <div className="io_map-tree">
          {tree.map((root) => <IoBranch key={root.node.id} branch={root} objectives={objectives} initiatives={initiatives} />)}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function IoBranch({ branch, objectives, initiatives }: { branch: IoTreeNode; objectives: Objective[]; initiatives: Initiative[] }) {
  const { node } = branch
  const createNode = useCreateIoNode()
  const updateNode = useUpdateIoNode()
  const deleteNode = useDeleteIoNode()
  const [titleError, setTitleError] = useState<string | null>(null)
  const childLabel = IO_CHILD_LABEL[node.kind]

  function rename(value: string) {
    const title = value.trim()
    if (!title) { setTitleError('Title can’t be blank'); return }
    setTitleError(null)
    if (title !== node.title) updateNode.mutate({ id: node.id, title })
  }

  return (
    <div className="io_map-branch">
      <article className={`io_map-node io_map-node--${node.kind}`} aria-label={`${IO_KIND_LABEL[node.kind]}: ${node.title}`}>
        <span className="io_map-kind">{IO_KIND_LABEL[node.kind]}</span>
        <Input key={node.title} aria-label={`Title of ${node.title}`} defaultValue={node.title} onBlur={(e) => rename(e.target.value)} />
        <FormError message={titleError} />
        <Select
          aria-label={`Measured by for ${node.title}`}
          value={linkValue(node)}
          onChange={(e) => updateNode.mutate({ id: node.id, ...linkChange(e.target.value) })}
        >
          <option value="">Not linked</option>
          {objectives.map((o) => <option key={`o${o.id}`} value={`o:${o.id}`}>Objective: {o.title}</option>)}
          {initiatives.map((i) => <option key={`i${i.id}`} value={`i:${i.id}`}>Initiative: {i.title}</option>)}
        </Select>
        {node.progress !== null && (
          <div className="io_map-progress">
            <ProgressBar percent={node.progress} />
            <span>{node.progress}%</span>
          </div>
        )}
        <div className="io_map-actions">
          {childLabel && (
            <Button variant="secondary" onClick={() => createNode.mutate({ title: `New ${childLabel}`, parent_id: node.id })}>
              <Plus className="io_map-icon" aria-hidden="true" /> Add {childLabel}
            </Button>
          )}
          <Button aria-label={`Delete ${node.title}`} onClick={() => deleteNode.mutate(node.id)}>
            <X className="io_map-icon" aria-hidden="true" />
          </Button>
        </div>
      </article>
      {branch.children.length > 0 && (
        <div className="io_map-children">
          {branch.children.map((child) => <IoBranch key={child.node.id} branch={child} objectives={objectives} initiatives={initiatives} />)}
        </div>
      )}
    </div>
  )
}

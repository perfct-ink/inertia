import { useRef, useState } from 'react'
import { Goal, Loader2, Plus, X } from 'lucide-react'
import { Button, FormError, HealthBadge, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import {
  useCreateKeyResult, useCreateObjective, useDeleteKeyResult, useDeleteObjective, useObjectives,
  useUpdateKeyResult, useUpdateObjective,
} from '@/api/objectives'
import { useInitiatives } from '@/api/initiatives'
import { formatScore, keyResultMeasure } from '@/data/okr'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import type { Initiative, KeyResult, Objective } from '@/types'
import './OkrsScreen.scss'

// OKRs (PM-31): objectives for a period, each measured by key results that
// are either a number updated by hand or an initiative's task progress.
export default function OkrsScreen() {
  usePageTitle('OKRs')
  const { data: objectives = [], isLoading } = useObjectives()
  const { data: initiatives = [] } = useInitiatives()
  const createObjective = useCreateObjective()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createObjective.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="view-okrs">
        <div className="okrs-header">
          <h1 className="okrs-title">OKRs</h1>
          <Button variant="primary" onClick={() => { titleRef.current = ''; setAdding(true) }} className="okrs-new">
            <Plus className="okrs-icon" aria-hidden="true" />
            New objective
          </Button>
        </div>

        <div className="okrs-body">
          <div className="okrs-list">
            {adding && (
              <Input
                autoFocus
                aria-label="Objective"
                placeholder="Objective, e.g. Make onboarding effortless"
                onChange={(e) => { titleRef.current = e.target.value }}
                onBlur={() => commitAdd(titleRef.current)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd(titleRef.current)
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
            )}

            {isLoading && <Loader2 className="okrs-icon okrs-icon--spin" aria-label="Loading" />}

            {!isLoading && objectives.length === 0 && !adding && (
              <div className="okrs-empty">
                <Goal className="okrs-empty_icon" aria-hidden="true" />
                <p>No objectives yet. An objective is what you want to achieve this period; key results say how you&rsquo;ll know.</p>
              </div>
            )}

            {objectives.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} initiatives={initiatives} />
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function ObjectiveCard({ objective, initiatives }: { objective: Objective; initiatives: Initiative[] }) {
  const updateObjective = useUpdateObjective()
  const deleteObjective = useDeleteObjective()

  return (
    <article className="okrs-card" aria-labelledby={`objective-${objective.id}`}>
      <div className="okrs-card-top">
        <h2 id={`objective-${objective.id}`} className="okrs-card-title">{objective.title}</h2>
        <HealthBadge health={objective.health} />
        <span className="okrs-score" title="Score (0 to 1)">{formatScore(objective.score)}</span>
        <Button
          onClick={() => deleteObjective.mutate(objective.id)}
          aria-label={`Delete ${objective.title}`}
          className="okrs-delete"
        >
          <X className="okrs-icon" aria-hidden="true" />
        </Button>
      </div>

      <div className="okrs-period">
        <Input
          type="date"
          aria-label="Period start"
          value={objective.start_date ?? ''}
          onChange={(e) => updateObjective.mutate({ id: objective.id, start_date: e.target.value || null })}
          className="okrs-date"
        />
        <span aria-hidden="true">&rarr;</span>
        <Input
          type="date"
          aria-label="Period end"
          value={objective.target_date ?? ''}
          onChange={(e) => updateObjective.mutate({ id: objective.id, target_date: e.target.value || null })}
          className="okrs-date"
        />
      </div>

      <ProgressBar percent={objective.percent} />

      <ul className="okrs-krs">
        {objective.key_results.map((kr) => (
          <KeyResultRow key={kr.id} kr={kr} initiative={initiatives.find((i) => i.id === kr.initiative_id)} />
        ))}
      </ul>

      <AddKeyResult objectiveId={objective.id} initiatives={initiatives} />
    </article>
  )
}

function KeyResultRow({ kr, initiative }: { kr: KeyResult; initiative: Initiative | undefined }) {
  const updateKeyResult = useUpdateKeyResult()
  const deleteKeyResult = useDeleteKeyResult()
  const measure = keyResultMeasure(kr)

  return (
    <li className="okrs-kr">
      <div className="okrs-kr-top">
        <span className="okrs-kr-title">{kr.title}</span>
        <span className="okrs-kr-percent">{kr.percent}%</span>
        <Button onClick={() => deleteKeyResult.mutate(kr.id)} aria-label={`Delete key result ${kr.title}`} className="okrs-delete">
          <X className="okrs-icon" aria-hidden="true" />
        </Button>
      </div>
      <ProgressBar percent={kr.percent} />
      <div className="okrs-kr-measure">
        {measure === null
          ? <span>From initiative {initiative?.title ?? '(removed)'}: {initiative ? `${initiative.done_tasks_count}/${initiative.tasks_count} tasks done` : ''}</span>
          : (
            <>
              <Input
                key={kr.current_value}
                type="number"
                aria-label={`Current value for ${kr.title}`}
                defaultValue={kr.current_value}
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (e.target.value !== '' && value !== kr.current_value) updateKeyResult.mutate({ id: kr.id, current_value: value })
                }}
                className="okrs-number"
              />
              <span>{measure}</span>
            </>
          )}
      </div>
    </li>
  )
}

function AddKeyResult({ objectiveId, initiatives }: { objectiveId: number; initiatives: Initiative[] }) {
  const createKeyResult = useCreateKeyResult()
  const [title, setTitle] = useState('')
  // "" measures a number; otherwise an initiative id.
  const [source, setSource] = useState('')
  const [startValue, setStartValue] = useState('0')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')

  function add() {
    if (!title.trim()) return
    const data = source
      ? { title: title.trim(), initiative_id: Number(source) }
      : { title: title.trim(), start_value: Number(startValue || 0), current_value: Number(startValue || 0), target_value: Number(target), unit: unit.trim() || null }
    createKeyResult.mutate({ objective_id: objectiveId, ...data }, {
      onSuccess: () => { setTitle(''); setSource(''); setTarget(''); setUnit(''); setStartValue('0') },
    })
  }

  return (
    <div className="okrs-add">
      <div className="okrs-add-row">
        <Input
          aria-label="New key result"
          placeholder="Add a key result…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          className="okrs-add-title"
        />
        <Select aria-label="Measured by" value={source} onChange={(e) => setSource(e.target.value)} className="okrs-add-source">
          <option value="">A number</option>
          {initiatives.map((i) => <option key={i.id} value={i.id}>Initiative: {i.title}</option>)}
        </Select>
      </div>
      {!source && (
        <div className="okrs-add-row">
          <Input type="number" aria-label="Start value" placeholder="From" value={startValue} onChange={(e) => setStartValue(e.target.value)} className="okrs-number" />
          <Input type="number" aria-label="Target value" placeholder="To" value={target} onChange={(e) => setTarget(e.target.value)} className="okrs-number" />
          <Input aria-label="Unit" placeholder="Unit (%, users…)" value={unit} onChange={(e) => setUnit(e.target.value)} className="okrs-unit" />
        </div>
      )}
      <div className="okrs-add-row">
        <Button variant="secondary" onClick={add} disabled={!title.trim() || (!source && target === '') || createKeyResult.isPending}>Add key result</Button>
        <FormError message={createKeyResult.isError ? errorMessage(createKeyResult.error) : null} />
      </div>
    </div>
  )
}

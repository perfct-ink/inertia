import { useRef, useState } from 'react'
import { Goal, Loader2, Pencil, Plus, X } from 'lucide-react'
import { Button, FormError, HealthBadge, Input, Select, DatePicker, Textarea } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useCreateObjective, useDeleteObjective, useObjectives, useUpdateObjective } from '@/api/objectives'
import { useCreateKeyResult, useDeleteKeyResult, useUpdateKeyResult } from '@/api/keyResults'
import { useCreateCheckIn, useKeyResultCheckIns } from '@/api/keyResultCheckIns'
import { useInitiatives } from '@/api/initiatives'
import { useWorkspace } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { formatScore, keyResultMeasure } from '@/data/okr'
import { PLANNING_STATUS_LABEL } from '@/data/planning'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import type { Initiative, KeyResult, Objective, PlanningStatus } from '@/types'
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
  const { data: workspace } = useWorkspace()
  const { data: members = [] } = useWorkspaceMembers(workspace?.id ?? 0)

  return (
    <article className="okrs-card" aria-labelledby={`objective-${objective.id}`}>
      <div className="okrs-card-top">
        <h2 id={`objective-${objective.id}`} className="okrs-card-title">
          <Input
            key={objective.title}
            aria-label="Objective title"
            defaultValue={objective.title}
            onBlur={(e) => { if (e.target.value !== objective.title) updateObjective.mutate({ id: objective.id, title: e.target.value }) }}
            className="okrs-title_input"
          />
        </h2>
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
        <DatePicker
          aria-label="Period start"
          value={objective.start_date ?? ''}
          onChange={(e) => updateObjective.mutate({ id: objective.id, start_date: e.target.value || null })}
          className="okrs-date"
        />
        <span aria-hidden="true">&rarr;</span>
        <DatePicker
          aria-label="Period end"
          value={objective.target_date ?? ''}
          onChange={(e) => updateObjective.mutate({ id: objective.id, target_date: e.target.value || null })}
          className="okrs-date"
        />
      </div>

      <div className="okrs-period">
        <Select
          aria-label="Status"
          value={objective.status}
          onChange={(e) => updateObjective.mutate({ id: objective.id, status: e.target.value as PlanningStatus })}
          className="okrs-select"
        >
          {Object.entries(PLANNING_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        {members.length > 0 && (
          <Select
            aria-label="Owner"
            value={objective.owner_id ?? ''}
            onChange={(e) => updateObjective.mutate({ id: objective.id, owner_id: e.target.value ? Number(e.target.value) : null })}
            className="okrs-select"
          >
            <option value="">No owner</option>
            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
          </Select>
        )}
      </div>
      <Textarea
        key={objective.description ?? ''}
        aria-label="Description"
        placeholder="Add a description…"
        defaultValue={objective.description ?? ''}
        onBlur={(e) => {
          const description = e.target.value.trim() || null
          if (description !== objective.description) updateObjective.mutate({ id: objective.id, description })
        }}
        className="okrs-description"
      />
      <FormError message={updateObjective.isError ? errorMessage(updateObjective.error) : null} />

      <ProgressBar percent={objective.percent} />

      <ul className="okrs-krs">
        {objective.key_results.map((kr) => (
          <KeyResultRow key={kr.id} kr={kr} initiative={initiatives.find((i) => i.id === kr.initiative_id)} initiatives={initiatives} />
        ))}
      </ul>

      <AddKeyResult objectiveId={objective.id} initiatives={initiatives} />
    </article>
  )
}

function KeyResultRow({ kr, initiative, initiatives }: { kr: KeyResult; initiative: Initiative | undefined; initiatives: Initiative[] }) {
  const updateKeyResult = useUpdateKeyResult()
  const deleteKeyResult = useDeleteKeyResult()
  const measure = keyResultMeasure(kr)
  const [editing, setEditing] = useState(false)

  return (
    <li className="okrs-kr">
      <div className="okrs-kr-top">
        <span className="okrs-kr-title">{kr.title}</span>
        <span className="okrs-kr-percent">{kr.percent}%</span>
        <Button onClick={() => setEditing((v) => !v)} aria-label={`Edit key result ${kr.title}`} aria-expanded={editing} className="okrs-delete">
          <Pencil className="okrs-icon" aria-hidden="true" />
        </Button>
        <Button onClick={() => deleteKeyResult.mutate(kr.id)} aria-label={`Delete key result ${kr.title}`} className="okrs-delete">
          <X className="okrs-icon" aria-hidden="true" />
        </Button>
      </div>
      <ProgressBar percent={kr.percent} />
      {editing && <KeyResultEditor kr={kr} initiatives={initiatives} onDone={() => setEditing(false)} />}
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
      {measure !== null && <CheckInHistory kr={kr} />}
    </li>
  )
}

// Edits a key result's title, source and, for a number, its start, target and unit.
function KeyResultEditor({ kr, initiatives, onDone }: { kr: KeyResult; initiatives: Initiative[]; onDone: () => void }) {
  const updateKeyResult = useUpdateKeyResult()
  const [title, setTitle] = useState(kr.title)
  const [source, setSource] = useState(kr.initiative_id ? String(kr.initiative_id) : '')
  const [startValue, setStartValue] = useState(String(kr.start_value))
  const [target, setTarget] = useState(kr.target_value === null ? '' : String(kr.target_value))
  const [unit, setUnit] = useState(kr.unit ?? '')

  function save() {
    const data = source
      ? { title: title.trim(), initiative_id: Number(source) }
      : { title: title.trim(), initiative_id: null, start_value: Number(startValue || 0), target_value: Number(target), unit: unit.trim() || null }
    updateKeyResult.mutate({ id: kr.id, ...data }, { onSuccess: onDone })
  }

  return (
    <div className="okrs-add">
      <div className="okrs-add-row">
        <Input aria-label="Key result title" value={title} onChange={(e) => setTitle(e.target.value)} className="okrs-add-title" />
        <Select aria-label="Measured by" value={source} onChange={(e) => setSource(e.target.value)} className="okrs-add-source">
          <option value="">A number</option>
          {initiatives.map((i) => <option key={i.id} value={i.id}>Initiative: {i.title}</option>)}
        </Select>
      </div>
      {!source && (
        <div className="okrs-add-row">
          <Input type="number" aria-label="Start value" value={startValue} onChange={(e) => setStartValue(e.target.value)} className="okrs-number" />
          <Input type="number" aria-label="Target value" value={target} onChange={(e) => setTarget(e.target.value)} className="okrs-number" />
          <Input aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="okrs-unit" />
        </div>
      )}
      <div className="okrs-add-row">
        <Button variant="primary" onClick={save} disabled={updateKeyResult.isPending}>Save key result</Button>
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <FormError message={updateKeyResult.isError ? errorMessage(updateKeyResult.error) : null} />
      </div>
    </div>
  )
}

// Add a dated check-in (value and note) and review the earlier ones.
function CheckInHistory({ kr }: { kr: KeyResult }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const { data: checkIns = [] } = useKeyResultCheckIns(kr.id, open)
  const createCheckIn = useCreateCheckIn(kr.id)

  function add() {
    if (value === '') return
    createCheckIn.mutate({ value: Number(value), note: note.trim() || undefined }, {
      onSuccess: () => { setValue(''); setNote('') },
    })
  }

  return (
    <div className="okrs-checkins">
      <Button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide check-ins' : 'Check-ins'}
      </Button>
      {open && (
        <>
          <div className="okrs-add-row">
            <Input type="number" aria-label={`Check-in value for ${kr.title}`} placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} className="okrs-number" />
            <Input aria-label={`Check-in note for ${kr.title}`} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button variant="secondary" onClick={add} disabled={value === '' || createCheckIn.isPending}>Add check-in</Button>
          </div>
          <ul className="okrs-checkin_list">
            {checkIns.length === 0 && <li>No check-ins yet.</li>}
            {checkIns.map((c) => (
              <li key={c.id}>
                {new Date(c.created_at).toLocaleDateString()}: {c.value}{kr.unit ? ` ${kr.unit}` : ''}
                {c.note ? ` — ${c.note}` : ''}{c.author_name ? ` (${c.author_name})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
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

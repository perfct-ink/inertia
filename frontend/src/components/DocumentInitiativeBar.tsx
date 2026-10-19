import { useState } from 'react'
import { Input, Select, Button, FormError } from '@/components/ui'
import { useCreateInitiative, useInitiatives, useUpdateInitiative } from '@/api/initiatives'
import { useUpdateDocument } from '@/api/documents'
import { errorMessage } from '@/util/errorMessage'
import type { Document } from '@/types'
import './DocumentInitiativeBar.scss'

// Pick, create or clear the document's initiative and set its start and end
// date without leaving the document. The dates belong to the initiative, so
// they show on the Roadmap and Gantt like any other.
export default function DocumentInitiativeBar({ doc }: { doc: Document }) {
  const { data: initiatives = [] } = useInitiatives()
  const createInitiative = useCreateInitiative()
  const updateInitiative = useUpdateInitiative()
  const updateDocument = useUpdateDocument()
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const initiative = initiatives.find((i) => i.id === doc.initiative_id)

  function setInitiative(id: number | null) {
    setError(null)
    updateDocument.mutate({ id: doc.id, initiative_id: id }, { onError: (e) => setError(errorMessage(e)) })
  }

  function createAndAttach() {
    const title = newTitle.trim()
    if (!title) return
    setError(null)
    createInitiative.mutate({ title }, {
      onSuccess: (created) => { setNewTitle(''); setInitiative(created.id) },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <div className="document-initiative" role="group" aria-label="Initiative">
      <Select
        aria-label="Initiative"
        value={doc.initiative_id ?? ''}
        onChange={(e) => setInitiative(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">No initiative</option>
        {initiatives.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
      </Select>
      {initiative ? (
        <>
          <Input
            type="date"
            aria-label="Initiative start"
            value={initiative.start_date ?? ''}
            onChange={(e) => updateInitiative.mutate({ id: initiative.id, start_date: e.target.value || null }, { onError: (err) => setError(errorMessage(err)) })}
          />
          <span aria-hidden="true">&rarr;</span>
          <Input
            type="date"
            aria-label="Initiative end"
            value={initiative.target_date ?? ''}
            onChange={(e) => updateInitiative.mutate({ id: initiative.id, target_date: e.target.value || null }, { onError: (err) => setError(errorMessage(err)) })}
          />
          <span className="document-initiative_progress">{initiative.done_tasks_count}/{initiative.tasks_count} tasks done</span>
        </>
      ) : (
        <>
          <Input
            aria-label="New initiative"
            placeholder="New initiative…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createAndAttach() }}
          />
          <Button variant="secondary" onClick={createAndAttach} disabled={!newTitle.trim() || createInitiative.isPending}>Create</Button>
        </>
      )}
      <FormError message={error} />
    </div>
  )
}

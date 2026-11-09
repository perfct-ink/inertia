import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckSquare, Loader2, Pencil, ThumbsUp, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Input, PromptDialog, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useDeleteRetrospective, useRetrospectiveBoard, useUpdateRetrospective } from '@/api/retrospectives'
import {
  useCreateRetroCard, useDeleteRetroCard, useMakeRetroTask, useToggleRetroVote, useUpdateRetroCard,
} from '@/api/retroCards'
import { useSprints } from '@/api/sprints'
import {
  MAX_CARD_LENGTH, canMakeTask, cardsByColumn, retroSummary, retroTemplate, type RetroCard, type RetroColumn, type RetroTemplate,
} from '@/data/retrospective'
import { sprintBoardPath } from '@/data/sprint'
import { usePageTitle } from '@/hooks/usePageTitle'
import './RetrospectiveBoardScreen.scss'

// One retrospective board: the template's columns side by side (stacked on a
// phone). Anyone in the Space can add cards, vote once per card, move cards
// between columns and turn action items into backlog tasks.
export default function RetrospectiveBoardScreen() {
  const { id } = useParams()
  const retroId = Number(id)
  const navigate = useNavigate()
  const { data: board, isLoading, isError } = useRetrospectiveBoard(retroId)
  const { data: sprints = [] } = useSprints()
  const updateRetrospective = useUpdateRetrospective()
  const deleteRetrospective = useDeleteRetrospective()
  const [byVotes, setByVotes] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  usePageTitle(board?.title ?? 'Retrospective')

  const template = board ? retroTemplate(board.template) : null
  const sprint = board ? sprints.find((s) => s.id === board.sprint_id) : undefined
  const summary = board ? retroSummary(board) : null

  return (
    <WorkspaceLayout>
      <div className="view-retrospective_board">
        <div className="retrospective_board-header">
          <Link to="/retrospectives" className="retrospective_board-back">
            <ArrowLeft className="retrospective_board-icon" aria-hidden="true" />
            All retrospectives
          </Link>
          {board && template && (
            <>
              <div className="retrospective_board-heading">
                <h1 className="retrospective_board-title">{board.title}</h1>
                <p className="retrospective_board-meta">
                  {template.label}
                  {sprint && <> · <Link to={sprintBoardPath(sprint.id)} className="retrospective_board-sprint">{sprint.title}</Link></>}
                  {summary && ` · ${summary}`}
                </p>
              </div>
              <div className="retrospective_board-actions">
                <Button variant="secondary" aria-pressed={byVotes} onClick={() => setByVotes((on) => !on)}>
                  Sort by votes
                </Button>
                <Button variant="secondary" onClick={() => setRenaming(true)}>Rename</Button>
                <Button variant="secondary" onClick={() => setDeleting(true)}>Delete</Button>
              </div>
            </>
          )}
        </div>

        <div className="retrospective_board-body">
          {isLoading && <Loader2 className="retrospective_board-icon retrospective_board-icon--spin" aria-label="Loading" />}

          {isError && (
            <p className="retrospective_board-empty" role="alert">This retrospective could not be loaded. It may have been deleted.</p>
          )}

          {board && template && (
            <div className="retrospective_board-columns">
              {cardsByColumn(template, board.cards, byVotes).map(({ column, cards }) => (
                <Column key={column.key} retroId={board.id} template={template} column={column} cards={cards} />
              ))}
            </div>
          )}
        </div>
      </div>

      {board && (
        <>
          <PromptDialog
            open={renaming}
            title="Rename retrospective"
            label="Title"
            initialValue={board.title}
            onSubmit={(title) => { if (title) updateRetrospective.mutate({ id: board.id, title }) }}
            onClose={() => setRenaming(false)}
          />
          <ConfirmDialog
            open={deleting}
            title={`Delete ${board.title}?`}
            description="Its cards and votes are deleted. Tasks made from action items stay."
            confirmLabel="Delete"
            destructive
            onConfirm={() => deleteRetrospective.mutate(board.id, { onSuccess: () => navigate('/retrospectives') })}
            onClose={() => setDeleting(false)}
          />
        </>
      )}
    </WorkspaceLayout>
  )
}

function Column({ retroId, template, column, cards }: { retroId: number; template: RetroTemplate; column: RetroColumn; cards: RetroCard[] }) {
  const headingId = `retro-column-${column.key}`
  return (
    <section className="retrospective_board-column" aria-labelledby={headingId}>
      <header className="retrospective_board-column_header">
        <h2 id={headingId} className="retrospective_board-column_title">{column.label}</h2>
        <span className="retrospective_board-count" aria-label={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}>{cards.length}</span>
      </header>
      {cards.length === 0 && <p className="retrospective_board-hint">{column.hint}</p>}
      <ul className="retrospective_board-cards">
        {cards.map((card) => (
          <li key={card.id}><Card card={card} template={template} /></li>
        ))}
      </ul>
      <Composer retroId={retroId} column={column} />
    </section>
  )
}

function Composer({ retroId, column }: { retroId: number; column: RetroColumn }) {
  const createCard = useCreateRetroCard()
  const [body, setBody] = useState('')

  // The text stays when the call fails so it can be sent again.
  function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    createCard.mutate({ retrospective_id: retroId, column_key: column.key, body: text }, { onSuccess: () => setBody('') })
  }

  return (
    <form onSubmit={submit} className="retrospective_board-composer">
      <Input
        aria-label={`Add a card to ${column.label}`}
        placeholder="Add a card…"
        maxLength={MAX_CARD_LENGTH}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit" variant="primary" disabled={createCard.isPending || !body.trim()} aria-label={`Add card to ${column.label}`}>
        Add
      </Button>
    </form>
  )
}

function Card({ card, template }: { card: RetroCard; template: RetroTemplate }) {
  const updateCard = useUpdateRetroCard()
  const deleteCard = useDeleteRetroCard()
  const toggleVote = useToggleRetroVote()
  const makeTask = useMakeRetroTask()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <article className="retrospective_board-card">
      <p className="retrospective_board-card_body">{card.body}</p>
      <div className="retrospective_board-card_footer">
        <Button
          className="retrospective_board-vote"
          aria-pressed={card.voted}
          aria-label={`${card.voted ? 'Remove your vote from' : 'Vote for'} this card, ${card.votes_count} ${card.votes_count === 1 ? 'vote' : 'votes'}`}
          disabled={toggleVote.isPending}
          onClick={() => toggleVote.mutate({ id: card.id, voted: card.voted })}
        >
          <ThumbsUp className="retrospective_board-icon" aria-hidden="true" />
          <span>{card.votes_count}</span>
        </Button>
        <Select
          aria-label="Move card to column"
          value={card.column_key}
          onChange={(e) => updateCard.mutate({ id: card.id, column_key: e.target.value })}
          className="retrospective_board-move"
        >
          {template.columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </Select>
        <Button className="retrospective_board-icon_button" aria-label="Edit card" onClick={() => setEditing(true)}>
          <Pencil className="retrospective_board-icon" aria-hidden="true" />
        </Button>
        <Button className="retrospective_board-icon_button retrospective_board-icon_button--danger" aria-label="Delete card" onClick={() => setDeleting(true)}>
          <Trash2 className="retrospective_board-icon" aria-hidden="true" />
        </Button>
      </div>
      {canMakeTask(card) && (
        <Button variant="secondary" className="retrospective_board-make_task" disabled={makeTask.isPending} onClick={() => makeTask.mutate(card.id)}>
          <CheckSquare className="retrospective_board-icon" aria-hidden="true" />
          Create task
        </Button>
      )}
      {card.task_id !== null && (
        <p className="retrospective_board-task">
          <CheckSquare className="retrospective_board-icon" aria-hidden="true" />
          Task created
        </p>
      )}
      <PromptDialog
        open={editing}
        title="Edit card"
        label="Card text"
        initialValue={card.body}
        submitLabel="Save"
        onSubmit={(body) => { if (body && body !== card.body) updateCard.mutate({ id: card.id, body }) }}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete this card?"
        description={card.votes_count > 0 ? 'Its votes are deleted with it. A task made from it stays.' : 'A task made from it stays.'}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteCard.mutate(card.id)}
        onClose={() => setDeleting(false)}
      />
    </article>
  )
}

// Retrospective boards: a team looks back on a sprint by putting cards in
// columns. The template picked when a board is created decides the columns.
// RETRO_TEMPLATES holds their labels and must list the same column keys as
// Retrospective::TEMPLATES in backend/app/models/retrospective.rb.

export type RetroTemplateKey = 'went_well' | 'start_stop_continue' | 'four_ls' | 'mad_sad_glad'

export interface RetroColumn {
  key: string
  label: string
  // A prompt shown in an empty column.
  hint: string
}

export interface RetroTemplate {
  key: RetroTemplateKey
  label: string
  description: string
  columns: RetroColumn[]
}

// Every template ends with this column; its cards can become tasks.
export const ACTION_COLUMN = 'action_items'
export const DEFAULT_TEMPLATE: RetroTemplateKey = 'went_well'
// The longest a card's text may be (RetroCard::MAX_BODY_LENGTH).
export const MAX_CARD_LENGTH = 1000

const ACTION_ITEMS: RetroColumn = { key: ACTION_COLUMN, label: 'Action items', hint: 'What will we change next sprint?' }

export const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    key: 'went_well',
    label: 'Went well, to improve, actions',
    description: 'The classic: what to keep, what to fix, and what we will do about it.',
    columns: [
      { key: 'went_well', label: 'Went well', hint: 'What should we keep doing?' },
      { key: 'to_improve', label: 'To improve', hint: 'What slowed us down?' },
      ACTION_ITEMS,
    ],
  },
  {
    key: 'start_stop_continue',
    label: 'Start, stop, continue',
    description: 'Practices to begin, drop and keep.',
    columns: [
      { key: 'start', label: 'Start', hint: 'What should we begin doing?' },
      { key: 'stop', label: 'Stop', hint: 'What is not working?' },
      { key: 'continue', label: 'Continue', hint: 'What is working well?' },
      ACTION_ITEMS,
    ],
  },
  {
    key: 'four_ls',
    label: '4 Ls',
    description: 'Liked, learned, lacked and longed for.',
    columns: [
      { key: 'liked', label: 'Liked', hint: 'What did we enjoy?' },
      { key: 'learned', label: 'Learned', hint: 'What did we find out?' },
      { key: 'lacked', label: 'Lacked', hint: 'What was missing?' },
      { key: 'longed_for', label: 'Longed for', hint: 'What do we wish we had?' },
      ACTION_ITEMS,
    ],
  },
  {
    key: 'mad_sad_glad',
    label: 'Mad, sad, glad',
    description: 'How the sprint felt, for teams that want to talk about feelings first.',
    columns: [
      { key: 'mad', label: 'Mad', hint: 'What frustrated us?' },
      { key: 'sad', label: 'Sad', hint: 'What disappointed us?' },
      { key: 'glad', label: 'Glad', hint: 'What made us happy?' },
      ACTION_ITEMS,
    ],
  },
]

// The template for a key, or the default one for a key this client does not know.
export function retroTemplate(key: string): RetroTemplate {
  return RETRO_TEMPLATES.find((t) => t.key === key) ?? RETRO_TEMPLATES[0]
}

export interface Retrospective {
  id: number
  title: string
  template: RetroTemplateKey
  sprint_id: number | null
  // The project (a folder) the board is filed in; null is Space-wide.
  folder_id: number | null
  created_by_id: number | null
  cards_count: number
  tasks_count: number
  created_at: string
  updated_at: string
}

export interface RetroCard {
  id: number
  retrospective_id: number
  column_key: string
  body: string
  author_id: number | null
  // Set once an action item has been turned into a task.
  task_id: number | null
  votes_count: number
  // Whether the signed-in user has voted for it; who else did is never sent.
  voted: boolean
  created_at: string
  updated_at: string
}

export interface RetrospectiveBoard extends Retrospective {
  cards: RetroCard[]
}

export interface RetroColumnCards {
  column: RetroColumn
  cards: RetroCard[]
}

// The board's cards grouped under the template's columns, in column order.
// Cards keep the order they were added in, or with `byVotes` the most voted
// come first (ties keep the order added). A card filed under a column the
// template does not have is left out.
export function cardsByColumn(template: RetroTemplate, cards: RetroCard[], byVotes = false): RetroColumnCards[] {
  return template.columns.map((column) => {
    const inColumn = cards.filter((card) => card.column_key === column.key)
    const ordered = byVotes ? [...inColumn].sort((a, b) => b.votes_count - a.votes_count || a.id - b.id) : inColumn
    return { column, cards: ordered }
  })
}

// "3 cards, 1 task" under a board's title; null for an empty board.
export function retroSummary(retro: Pick<Retrospective, 'cards_count' | 'tasks_count'>): string | null {
  if (retro.cards_count === 0) return null
  const noun = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const cards = noun(retro.cards_count, 'card')
  return retro.tasks_count > 0 ? `${cards}, ${noun(retro.tasks_count, 'task')}` : cards
}

// A starting title for a new board: after its sprint when it has one,
// otherwise after today's date (an ISO date).
export function suggestedTitle(sprintTitle: string | null | undefined, today: string): string {
  return sprintTitle ? `${sprintTitle} retrospective` : `Retrospective ${today}`
}

// A card can only be turned into a task when it is an action item without one.
export function canMakeTask(card: Pick<RetroCard, 'column_key' | 'task_id'>): boolean {
  return card.column_key === ACTION_COLUMN && card.task_id === null
}

// Where a retrospective board lives.
export function retrospectivePath(id: number): string {
  return `/retrospectives/${id}`
}

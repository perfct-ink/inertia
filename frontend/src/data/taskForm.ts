import type { TaskStatus } from '@/types'
import type {
  TaskForm, TaskFormAnswers, TaskFormQuestion, TaskFormQuestionKind, TaskFormTarget,
} from '@/types/taskForm'

// The kinds of question a form can ask, in the order the type picker shows them.
export const QUESTION_KINDS: { value: TaskFormQuestionKind; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'date', label: 'Date' },
  { value: 'choice', label: 'Choice' },
]

export const TARGET_LABEL: Record<TaskFormTarget, string> = {
  title: 'Task title',
  description: 'Task description',
  start_date: 'Start date',
  due_date: 'Due date',
  details: 'Extra detail in the description',
}

// Which kinds of question can fill in each part of the task. Mirrors
// TaskFormSchema::TARGET_KINDS on the server, which is the one that enforces it.
export const TARGET_KINDS: Record<TaskFormTarget, TaskFormQuestionKind[]> = {
  title: ['short_text'],
  description: ['short_text', 'long_text'],
  start_date: ['date'],
  due_date: ['date'],
  details: ['short_text', 'long_text', 'date', 'choice'],
}

export const MAX_QUESTIONS = 20

// Mirror TaskForm::PUBLIC_HOURLY_LIMIT and PublicFormsController::PER_IP_LIMIT
// on the server: public responses an hour for a whole form, and from one address.
export const PUBLIC_HOURLY_LIMIT = 30
export const PUBLIC_IP_HOURLY_LIMIT = 10

// Parts of the task a question of this kind can fill in.
export function targetsFor(kind: TaskFormQuestionKind): TaskFormTarget[] {
  return (Object.keys(TARGET_KINDS) as TaskFormTarget[]).filter((target) => TARGET_KINDS[target].includes(kind))
}

// A blank extra question with an id no other question uses.
export function newQuestion(existing: TaskFormQuestion[]): TaskFormQuestion {
  const taken = new Set(existing.map((q) => q.id))
  let n = existing.length + 1
  while (taken.has(`q${n}`)) n += 1
  return { id: `q${n}`, label: '', kind: 'short_text', target: 'details', required: false, options: [] }
}

// Change a question's type: the part of the task it fills in switches to one
// the new type fits, and choices appear or go with the type.
export function changeKind(question: TaskFormQuestion, kind: TaskFormQuestionKind): TaskFormQuestion {
  const target = TARGET_KINDS[question.target].includes(kind) ? question.target : targetsFor(kind)[0]
  return { ...question, kind, target, options: kind === 'choice' ? question.options : [] }
}

// Change what a question fills in. The title is always required.
export function changeTarget(question: TaskFormQuestion, target: TaskFormTarget): TaskFormQuestion {
  return { ...question, target, required: target === 'title' ? true : question.required }
}

// The parts of the task the other questions already fill in; each of title,
// description, start date and due date can only be asked for once.
export function takenTargets(questions: TaskFormQuestion[], except: TaskFormQuestion): Set<TaskFormTarget> {
  return new Set(questions.filter((q) => q.id !== except.id && q.target !== 'details').map((q) => q.target))
}

// Choices are typed one per line.
export function optionsFromText(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter((line) => line !== '')
}

export function optionsToText(options: string[]): string {
  return options.join('\n')
}

export function emptyAnswers(questions: TaskFormQuestion[]): TaskFormAnswers {
  return Object.fromEntries(questions.map((q) => [q.id, '']))
}

// What to tell the person filling in the form before anything is sent:
// question id -> message, for required questions left blank. The server
// checks everything else (dates, choices, lengths).
export function answerProblems(questions: TaskFormQuestion[], answers: TaskFormAnswers): Record<string, string> {
  const problems: Record<string, string> = {}
  for (const question of questions) {
    if (question.required && (answers[question.id] ?? '').trim() === '') problems[question.id] = `${question.label} is required`
  }
  return problems
}

// The shareable address of a public form: a plain web path (see
// docs/features/clean_urls.md); `origin` is passed in (window.location.origin).
export function publicFormUrl(origin: string, token: string): string {
  return `${origin}/f/${encodeURIComponent(token)}`
}

export function formStatusLabel(form: { enabled: boolean; public_access: boolean }): string {
  if (!form.enabled) return 'Closed'
  return form.public_access ? 'Open, public link' : 'Open to the Space'
}

// What the builder edits: the form's settings with ids as the strings the
// pickers hold ('' is none).
export interface TaskFormDraft {
  title: string
  description: string
  enabled: boolean
  public_access: boolean
  default_status: TaskStatus
  epic_id: string
  folder_id: string
  assignee_id: string
  questions: TaskFormQuestion[]
}

export function draftFromForm(form: TaskForm): TaskFormDraft {
  return {
    title: form.title,
    description: form.description ?? '',
    enabled: form.enabled,
    public_access: form.public_access,
    default_status: form.default_status,
    epic_id: form.epic_id == null ? '' : String(form.epic_id),
    folder_id: form.folder_id == null ? '' : String(form.folder_id),
    assignee_id: form.assignee_id == null ? '' : String(form.assignee_id),
    questions: form.questions,
  }
}

// The body of the save request. `public_access` is left out when it hasn't
// changed, so a member without the right to turn the link on can still save.
export function formInput(draft: TaskFormDraft, form: Pick<TaskForm, 'public_access'>) {
  const id = (value: string) => (value === '' ? null : Number(value))
  const description = draft.description.trim()
  return {
    title: draft.title.trim(),
    description: description === '' ? null : description,
    enabled: draft.enabled,
    default_status: draft.default_status,
    epic_id: id(draft.epic_id),
    folder_id: id(draft.folder_id),
    assignee_id: id(draft.assignee_id),
    questions: draft.questions,
    ...(draft.public_access !== form.public_access && { public_access: draft.public_access }),
  }
}

// Move a question up (-1) or down (1); at either end it stays put.
export function moveQuestion(questions: TaskFormQuestion[], index: number, delta: -1 | 1): TaskFormQuestion[] {
  const to = index + delta
  if (to < 0 || to >= questions.length) return questions
  const moved = [...questions]
  const [question] = moved.splice(index, 1)
  moved.splice(to, 0, question)
  return moved
}

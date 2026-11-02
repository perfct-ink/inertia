import type { Task } from '@/types'
import type {
  TaskFormAnswers, TaskFormQuestion, TaskFormQuestionKind, TaskFormTarget,
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

export const TASK_STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
]

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

// The shareable address of a public form. The app uses hash routing, so the
// route sits after the "#".
export function publicFormUrl(token: string, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}#/f/${token}`
}

export function formStatusLabel(form: { enabled: boolean; public_access: boolean }): string {
  if (!form.enabled) return 'Closed'
  return form.public_access ? 'Open, public link' : 'Open to the Space'
}

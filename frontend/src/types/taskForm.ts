import type { Task } from '@/types'

// A question on a form (mirrors TaskFormSchema on the server).
export type TaskFormQuestionKind = 'short_text' | 'long_text' | 'date' | 'choice'
// What the answer fills in on the new task. "details" answers are written into
// the description as "Label: answer" lines.
export type TaskFormTarget = 'title' | 'description' | 'start_date' | 'due_date' | 'details'

export interface TaskFormQuestion {
  id: string
  label: string
  kind: TaskFormQuestionKind
  target: TaskFormTarget
  required: boolean
  options: string[]
}

export interface TaskForm {
  id: number
  title: string
  description: string | null
  questions: TaskFormQuestion[]
  // Closed forms take no new responses.
  enabled: boolean
  // Whether anyone holding the link can fill the form in (admins turn it on).
  public_access: boolean
  // The public link's token; null unless public_access.
  token: string | null
  // Whether the server allows public links at all (PUBLIC_FORMS_ENABLED).
  public_links_available: boolean
  default_status: Task['status']
  epic_id: number | null
  folder_id: number | null
  assignee_id: number | null
  submissions_count: number
  created_at: string
  updated_at: string
}

// What a person filling in a form sees (a TaskForm has all of this too).
export type FillableForm = Pick<TaskForm, 'title' | 'description' | 'questions'>

// Question id -> what was typed or chosen.
export type TaskFormAnswers = Record<string, string>

// One filled-in form: the task it made and the answers behind it.
export interface TaskFormSubmission {
  id: number
  task_id: number
  task_title: string
  task_status: Task['status']
  submitted_by_name: string | null
  answers: { label: string; value: string }[]
  created_at: string
}

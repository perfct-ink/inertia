import api from '@/lib/api'
import type { TaskStatus } from '@/types'
import type { FillableForm, TaskForm, TaskFormAnswers, TaskFormQuestion, TaskFormSubmission } from '@/types/taskForm'
import { useQuery } from '@tanstack/react-query'
import { ApiResource, useApiMutation, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type TaskFormInput = {
  title: string
  description: string | null
  questions: TaskFormQuestion[]
  enabled: boolean
  public_access: boolean
  default_status: TaskStatus
  epic_id: number | null
  folder_id: number | null
  assignee_id: number | null
}

export class TaskFormApi extends ApiResource<TaskForm, Pick<TaskFormInput, 'title'> & Partial<TaskFormInput>, Partial<TaskFormInput>> {
  constructor() {
    super('/api/v1/task_forms', 'task_form', 'task_forms')
  }

  // Who filled the form in (newest first, up to 50) and the tasks they made.
  submissions(id: number) {
    return api.get<TaskFormSubmission[]>(`${this.url(id)}/submissions`).then((r) => r.data)
  }

  // Fill the form in as a signed-in member: the answers become a task.
  submit(id: number, answers: TaskFormAnswers) {
    return api.post<TaskFormSubmission>(`${this.url(id)}/submissions`, { answers }).then((r) => r.data)
  }
}

export const taskFormApi = new TaskFormApi()

// Response counts change whenever a form is filled in, so refetch on visit.
export const useTaskForms = () => useResourceList(taskFormApi, { staleTime: 0 })

// One form by id. Unlike the list it ignores the open project, so a form's own
// pages work whichever project is open.
export function useTaskForm(id: number) {
  return useQuery<TaskForm>({
    queryKey: ['task_forms', id],
    queryFn: () => taskFormApi.find(id),
    enabled: !!id,
    staleTime: 0,
  })
}
export const useCreateTaskForm = () => useResourceCreate(taskFormApi)
export const useUpdateTaskForm = () => useResourceUpdate(taskFormApi)
export const useDeleteTaskForm = () => useResourceDelete(taskFormApi)

export function useTaskFormSubmissions(formId: number | undefined) {
  return useQuery<TaskFormSubmission[]>({
    queryKey: ['task_form_submissions', formId],
    queryFn: () => taskFormApi.submissions(formId as number),
    enabled: formId !== undefined,
    staleTime: 0,
  })
}

export const useSubmitTaskForm = (formId: number) =>
  useApiMutation((answers: TaskFormAnswers) => taskFormApi.submit(formId, answers), ['task_forms', ['task_form_submissions', formId], 'tasks'])

// A public form, by the token in its link. The pages show these errors
// themselves (a missing link is a page, not a toast), hence `silent`.
export class PublicTaskFormApi {
  readonly path = '/api/v1/public_forms'

  find(token: string) {
    return api.get<FillableForm>(`${this.path}/${token}`, { silent: true }).then((r) => r.data)
  }

  // `website` is the honeypot field: people never see it, so it goes empty.
  submit(token: string, data: { answers: TaskFormAnswers; website: string }) {
    return api.post<{ submitted: boolean }>(`${this.path}/${token}/submissions`, data, { silent: true }).then((r) => r.data)
  }
}

export const publicTaskFormApi = new PublicTaskFormApi()

export function usePublicTaskForm(token: string | undefined) {
  return useQuery<FillableForm>({
    queryKey: ['public_task_form', token],
    queryFn: () => publicTaskFormApi.find(token as string),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  })
}

export const useSubmitPublicTaskForm = (token: string) =>
  useApiMutation((data: { answers: TaskFormAnswers; website: string }) => publicTaskFormApi.submit(token, data), [])

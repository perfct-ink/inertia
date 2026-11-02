import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { FillableForm, TaskForm, TaskFormAnswers, TaskFormQuestion, TaskFormSubmission } from '@/types/taskForm'

type TaskFormInput = {
  title: string
  description: string | null
  questions: TaskFormQuestion[]
  enabled: boolean
  public_access: boolean
  default_status: TaskForm['default_status']
  epic_id: number | null
  folder_id: number | null
  assignee_id: number | null
}

// Response counts change whenever a form is filled in, so refetch on visit.
export function useTaskForms() {
  return useQuery<TaskForm[]>({
    queryKey: ['task_forms'],
    queryFn: () => api.get('/api/v1/task_forms').then((r) => r.data),
    staleTime: 0,
  })
}

export function useCreateTaskForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<TaskFormInput, 'title'> & Partial<TaskFormInput>) =>
      api.post('/api/v1/task_forms', { task_form: data }).then((r) => r.data as TaskForm),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_forms'] }),
  })
}

export function useUpdateTaskForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TaskFormInput> & { id: number }) =>
      api.patch(`/api/v1/task_forms/${id}`, { task_form: data }).then((r) => r.data as TaskForm),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_forms'] }),
  })
}

export function useDeleteTaskForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/task_forms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_forms'] }),
  })
}

// Who filled the form in (newest first, up to 50) and the tasks they made.
export function useTaskFormSubmissions(formId: number | undefined) {
  return useQuery<TaskFormSubmission[]>({
    queryKey: ['task_form_submissions', formId],
    queryFn: () => api.get(`/api/v1/task_forms/${formId}/submissions`).then((r) => r.data),
    enabled: formId !== undefined,
    staleTime: 0,
  })
}

// Fill in a form as a signed-in member: the answers become a task.
export function useSubmitTaskForm(formId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (answers: TaskFormAnswers) =>
      api.post(`/api/v1/task_forms/${formId}/submissions`, { answers }).then((r) => r.data as TaskFormSubmission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_forms'] })
      qc.invalidateQueries({ queryKey: ['task_form_submissions', formId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// A public form, by the token in its link. The pages show these errors
// themselves (a missing link is a page, not a toast), hence `silent`.
export function usePublicTaskForm(token: string | undefined) {
  return useQuery<FillableForm>({
    queryKey: ['public_task_form', token],
    queryFn: () => api.get(`/api/v1/public_forms/${token}`, { silent: true }).then((r) => r.data),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  })
}

// `website` is the honeypot field: people never see it, so it goes empty.
export function useSubmitPublicTaskForm(token: string) {
  return useMutation({
    mutationFn: (data: { answers: TaskFormAnswers; website: string }) =>
      api.post(`/api/v1/public_forms/${token}/submissions`, data, { silent: true }).then((r) => r.data as { submitted: boolean }),
  })
}

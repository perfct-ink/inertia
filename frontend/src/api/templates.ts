import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { errorMessage } from '@/util/errorMessage'
import { partialFailureMessage, planItemCount, type TemplatePlan } from '@/data/template'

// Sends one create request and returns the new record's id. The picker shows
// a failed plan's error itself, so the middleware stays quiet.
export type Send = (url: string, body: Record<string, unknown>) => Promise<{ id: number }>

const send: Send = (url, body) => api.post(url, body, { silent: true }).then((response) => response.data)

// Creates what a plan lists, one request at a time and in order (each step
// needs the id of the one before). `added` is called after every record.
async function carryOut(plan: TemplatePlan, post: Send, added: () => void): Promise<void> {
  switch (plan.kind) {
    case 'project': {
      const folder = await post('/api/v1/folders', { folder: plan.folder })
      added()
      for (const file of plan.documents) {
        await post(`/api/v1/folders/${folder.id}/documents`, { document: file })
        added()
      }
      for (const task of plan.tasks) {
        await post('/api/v1/tasks', { task: { ...task, folder_id: folder.id } })
        added()
      }
      return
    }
    case 'roadmap':
      for (const { milestone, initiative } of plan.milestones) {
        const created = await post('/api/v1/milestones', { milestone })
        added()
        await post('/api/v1/initiatives', { initiative: { ...initiative, milestone_id: created.id } })
        added()
      }
      return
    case 'sprint': {
      const sprint = await post('/api/v1/sprints', { sprint: plan.sprint })
      added()
      for (const task of plan.tasks) {
        await post('/api/v1/tasks', { task: { ...task, sprint_id: sprint.id } })
        added()
      }
    }
  }
}

// Applies a template plan. Nothing is rolled back when a request fails, so the
// error says how many records were made before it stopped.
export async function applyTemplatePlan(plan: TemplatePlan, post: Send = send): Promise<void> {
  let done = 0
  try {
    await carryOut(plan, post, () => { done += 1 })
  } catch (error) {
    throw new Error(partialFailureMessage(errorMessage(error), done, planItemCount(plan)))
  }
}

export function useApplyTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: TemplatePlan) => applyTemplatePlan(plan),
    // Even a plan that stopped part-way left records behind.
    onSettled: () => {
      for (const key of ['workspace', 'folder-contents', 'tasks', 'milestones', 'initiatives', 'sprints']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi } from './documents'
import { folderApi } from './folders'
import { initiativeApi } from './initiatives'
import { milestoneApi } from './milestones'
import { sprintApi } from './sprints'
import { taskApi } from './tasks'
import { applyPlan, type Creators, type TemplatePlan } from '@/data/template'
import { errorMessage } from '@/util/errorMessage'

// A template creates records of several models, so it is written once here on
// top of the model classes rather than adding calls to each of them.
const creators: Creators = {
  folder: (data) => folderApi.create(data),
  document: (folderId, data) => documentApi.createIn(folderId, data),
  task: (data) => taskApi.create(data),
  milestone: (data) => milestoneApi.create(data),
  initiative: (data) => initiativeApi.create(data),
  sprint: (data) => sprintApi.create(data),
}

// Applies a template plan (see `applyPlan` for the order and for what a failure says).
export function applyTemplatePlan(plan: TemplatePlan, create: Creators = creators): Promise<void> {
  return applyPlan(plan, create, errorMessage)
}

// Even a plan that stopped part-way left records behind, so the lists refresh
// whether it finished or not (`useApiMutation` only refetches after a success).
export function useApplyTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: TemplatePlan) => applyTemplatePlan(plan),
    onSettled: () => {
      for (const key of ['workspace', 'folder-contents', 'tasks', 'milestones', 'initiatives', 'sprints']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

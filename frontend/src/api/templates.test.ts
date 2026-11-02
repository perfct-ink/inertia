import { applyTemplatePlan } from './templates'
import { documentApi } from './documents'
import { folderApi } from './folders'
import { initiativeApi } from './initiatives'
import { milestoneApi } from './milestones'
import { sprintApi } from './sprints'
import { taskApi } from './tasks'
import { PROJECT_TEMPLATES, ROADMAP_TEMPLATES, SPRINT_TEMPLATES, planTemplate } from '@/data/template'

jest.mock('./documents', () => ({ documentApi: { createIn: jest.fn() } }))
jest.mock('./folders', () => ({ folderApi: { create: jest.fn() } }))
jest.mock('./initiatives', () => ({ initiativeApi: { create: jest.fn() } }))
jest.mock('./milestones', () => ({ milestoneApi: { create: jest.fn() } }))
jest.mock('./sprints', () => ({ sprintApi: { create: jest.fn() } }))
jest.mock('./tasks', () => ({ taskApi: { create: jest.fn() } }))

beforeEach(() => {
  jest.resetAllMocks()
  ;(folderApi.create as jest.Mock).mockResolvedValue({ id: 7 })
  ;(sprintApi.create as jest.Mock).mockResolvedValue({ id: 8 })
  ;(milestoneApi.create as jest.Mock).mockResolvedValue({ id: 9 })
})

test('a project goes through the folder, document and task model classes', async () => {
  await applyTemplatePlan(planTemplate(PROJECT_TEMPLATES[0], { name: 'Billing', startDate: '2026-11-02' }))
  expect(folderApi.create).toHaveBeenCalledWith({ name: 'Billing', kind: 'project' })
  expect(documentApi.createIn).toHaveBeenCalledWith(7, { title: 'Product requirements', doc_type: 'document' })
  expect(documentApi.createIn).toHaveBeenCalledTimes(3)
  expect(taskApi.create).toHaveBeenCalledTimes(5)
  expect(taskApi.create).toHaveBeenCalledWith({ title: 'Write the product requirements', status: 'todo', position: 0, folder_id: 7 })
})

test('a sprint goes through the sprint and task model classes, with camelCase task fields', async () => {
  await applyTemplatePlan(planTemplate(SPRINT_TEMPLATES[0], { startDate: '2026-11-02' }))
  expect(sprintApi.create).toHaveBeenCalledWith({ title: 'Sprint starting Nov 2', start_date: '2026-11-02', end_date: '2026-11-15', status: 'planned' })
  expect(taskApi.create).toHaveBeenCalledWith({ title: 'Sprint planning', status: 'todo', position: 0, dueDate: '2026-11-02', sprintId: 8 })
})

test('a roadmap goes through the milestone and initiative model classes', async () => {
  await applyTemplatePlan(planTemplate(ROADMAP_TEMPLATES[1], { startDate: '2026-11-02' }))
  expect(milestoneApi.create).toHaveBeenCalledTimes(3)
  expect(initiativeApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Month 1 focus', milestone_id: 9, horizon: 'now' }))
})

test('a failed request is reported with the server text and how far the plan got', async () => {
  const refusal = Object.assign(new Error('Request failed'), { isAxiosError: true, response: { data: { errors: ['Title is required.'] } } })
  ;(taskApi.create as jest.Mock).mockResolvedValueOnce({}).mockRejectedValueOnce(refusal)
  await expect(applyTemplatePlan(planTemplate(SPRINT_TEMPLATES[0], { startDate: '2026-11-02' }))).rejects.toThrow(
    'Title is required. 2 of 5 items were added before it stopped; finish or delete the rest by hand.',
  )
})

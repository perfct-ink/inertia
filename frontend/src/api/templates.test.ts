import { applyTemplatePlan, type Send } from './templates'
import { PROJECT_TEMPLATES, ROADMAP_TEMPLATES, SPRINT_TEMPLATES, planTemplate } from '@/data/template'

// What axios throws for a 422: errorMessage reads the server's list of errors.
const refusal = () => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { data: { errors: ['Server said no.'] } } })

// A stand-in for the server: records each request and hands out ids 1, 2, 3...
function fakeServer(failAt = Infinity) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const send: Send = async (url, body) => {
    if (calls.length === failAt) throw refusal()
    calls.push({ url, body })
    return { id: calls.length }
  }
  return { calls, send }
}

test('a project plan makes the project folder, then its files and tasks inside it', async () => {
  const { calls, send } = fakeServer()
  await applyTemplatePlan(planTemplate(PROJECT_TEMPLATES[0], { name: 'Billing', startDate: '2026-11-02' }), send)
  expect(calls[0]).toEqual({ url: '/api/v1/folders', body: { folder: { name: 'Billing', kind: 'project' } } })
  expect(calls[1]).toEqual({ url: '/api/v1/folders/1/documents', body: { document: { title: 'Product requirements', doc_type: 'document' } } })
  const tasks = calls.filter((c) => c.url === '/api/v1/tasks')
  expect(tasks).toHaveLength(5)
  expect(tasks[0].body).toEqual({ task: { title: 'Write the product requirements', status: 'todo', position: 0, folder_id: 1 } })
  expect(calls).toHaveLength(1 + 3 + 5)
})

test('a sprint plan makes the sprint, then dated tasks assigned to it', async () => {
  const { calls, send } = fakeServer()
  await applyTemplatePlan(planTemplate(SPRINT_TEMPLATES[0], { startDate: '2026-11-02' }), send)
  expect(calls[0].url).toBe('/api/v1/sprints')
  expect(calls[0].body).toEqual({ sprint: { title: 'Sprint starting Nov 2', start_date: '2026-11-02', end_date: '2026-11-15', status: 'planned' } })
  expect(calls[1].body).toMatchObject({ task: { title: 'Sprint planning', sprint_id: 1, due_date: '2026-11-02' } })
  expect(calls).toHaveLength(5)
})

test('a roadmap plan makes each milestone before the initiative that points at it', async () => {
  const { calls, send } = fakeServer()
  await applyTemplatePlan(planTemplate(ROADMAP_TEMPLATES[1], { startDate: '2026-11-02' }), send)
  expect(calls.map((c) => c.url)).toEqual([
    '/api/v1/milestones', '/api/v1/initiatives',
    '/api/v1/milestones', '/api/v1/initiatives',
    '/api/v1/milestones', '/api/v1/initiatives',
  ])
  expect(calls[1].body).toMatchObject({ initiative: { milestone_id: 1, horizon: 'now' } })
  expect(calls[3].body).toMatchObject({ initiative: { milestone_id: 3, horizon: 'next' } })
})

// The message a plan stopped with ('' when it did not stop).
async function stoppedWith(plan: Promise<void>): Promise<string> {
  try {
    await plan
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

test('a failure before anything was made reports only the reason', async () => {
  const { send } = fakeServer(0)
  expect(await stoppedWith(applyTemplatePlan(planTemplate(SPRINT_TEMPLATES[0], { startDate: '2026-11-02' }), send))).toBe('Server said no.')
})

test('a failure part-way says how many records were made first', async () => {
  const { calls, send } = fakeServer(2)
  expect(await stoppedWith(applyTemplatePlan(planTemplate(SPRINT_TEMPLATES[0], { startDate: '2026-11-02' }), send))).toBe(
    'Server said no. 2 of 5 items were added before it stopped; finish or delete the rest by hand.',
  )
  expect(calls).toHaveLength(2)
})

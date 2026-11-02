import {
  PROJECT_TEMPLATES, ROADMAP_TEMPLATES, SPRINT_TEMPLATES, TEMPLATE_FORM,
  applyPlan, defaultName, describeTemplate, partialFailureMessage, planItemCount, planTemplate, templatesOf,
  type Creators, type ItemTemplate, type ProjectPlan, type RoadmapPlan, type SprintPlan,
} from './template'

const byId = (templates: ItemTemplate[], id: string) => templates.find((t) => t.id === id) as ItemTemplate

test('every kind has templates, with unique ids and a description', () => {
  for (const kind of ['project', 'roadmap', 'sprint'] as const) {
    const templates = templatesOf(kind)
    expect(templates.length).toBeGreaterThan(0)
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length)
    for (const template of templates) {
      expect(template.kind).toBe(kind)
      expect(template.label).not.toBe('')
      expect(template.description).not.toBe('')
    }
    expect(TEMPLATE_FORM[kind].title).not.toBe('')
  }
})

test('a project plan names the folder, keeps the starter files and adds ordered to-do tasks', () => {
  const plan = planTemplate(byId(PROJECT_TEMPLATES, 'software'), { name: '  Billing  ', startDate: '2026-11-02' }) as ProjectPlan
  expect(plan.kind).toBe('project')
  expect(plan.folder).toEqual({ name: 'Billing', kind: 'project' })
  expect(plan.documents.map((d) => d.title)).toEqual(['Product requirements', 'Technical design', 'Meeting notes'])
  expect(plan.tasks[0]).toEqual({ title: 'Write the product requirements', status: 'todo', position: 0 })
  expect(plan.tasks.map((t) => t.position)).toEqual([0, 1, 2, 3, 4])
  expect(planItemCount(plan)).toBe(1 + 3 + 5)
})

test('a blank project name falls back to the template name', () => {
  const event = byId(PROJECT_TEMPLATES, 'event')
  expect((planTemplate(event, { name: '   ', startDate: '2026-11-02' }) as ProjectPlan).folder.name).toBe('Event')
  expect((planTemplate(event, { startDate: '2026-11-02' }) as ProjectPlan).folder.name).toBe('Event')
})

test('sheets in a template stay sheets', () => {
  const plan = planTemplate(byId(PROJECT_TEMPLATES, 'campaign'), { startDate: '2026-11-02' }) as ProjectPlan
  expect(plan.documents).toContainEqual({ title: 'Budget', doc_type: 'spreadsheet' })
})

test('a two-week sprint runs 14 days from the start and dates its tasks from the ends', () => {
  const plan = planTemplate(byId(SPRINT_TEMPLATES, 'two_week'), { startDate: '2026-11-02' }) as SprintPlan
  expect(plan.sprint).toEqual({ title: 'Sprint starting Nov 2', start_date: '2026-11-02', end_date: '2026-11-15', status: 'planned' })
  expect(plan.tasks.map((t) => [t.title, t.dueDate])).toEqual([
    ['Sprint planning', '2026-11-02'],
    ['Mid-sprint check-in', '2026-11-09'],
    ['Sprint review', '2026-11-15'],
    ['Retrospective', '2026-11-15'],
  ])
  expect(planItemCount(plan)).toBe(5)
})

test('a one-week sprint crossing a year end, with its own name', () => {
  const plan = planTemplate(byId(SPRINT_TEMPLATES, 'one_week'), { name: 'Hotfix week', startDate: '2026-12-29' }) as SprintPlan
  expect(plan.sprint).toMatchObject({ title: 'Hotfix week', start_date: '2026-12-29', end_date: '2027-01-04' })
  expect(plan.tasks[plan.tasks.length - 1].dueDate).toBe('2027-01-04')
})

test('a roadmap plan puts a milestone and an initiative at each step, counted from the start date', () => {
  const plan = planTemplate(byId(ROADMAP_TEMPLATES, 'launch'), { startDate: '2026-11-02' }) as RoadmapPlan
  expect(plan.milestones.map((m) => [m.milestone.title, m.milestone.target_date])).toEqual([
    ['Discovery done', '2026-11-23'],
    ['Alpha', '2027-01-04'],
    ['Beta', '2027-02-15'],
    ['Launch', '2027-03-22'],
  ])
  expect(planItemCount(plan)).toBe(8)
})

test('roadmap initiatives run from the previous milestone to their own, Now then Next then Later', () => {
  const plan = planTemplate(byId(ROADMAP_TEMPLATES, 'launch'), { startDate: '2026-11-02' }) as RoadmapPlan
  const initiatives = plan.milestones.map((m) => m.initiative)
  expect(initiatives[0]).toMatchObject({ title: 'Research and requirements', start_date: '2026-11-02', target_date: '2026-11-23', horizon: 'now' })
  expect(initiatives[1]).toMatchObject({ start_date: '2026-11-23', target_date: '2027-01-04', horizon: 'next' })
  expect(initiatives.slice(2).map((i) => i.horizon)).toEqual(['later', 'later'])
  for (const m of plan.milestones) {
    expect(m.initiative.start_date <= m.initiative.target_date).toBe(true)
    expect(m.initiative.target_date).toBe(m.milestone.target_date)
  }
})

test('describeTemplate counts what a template adds', () => {
  expect(describeTemplate(byId(PROJECT_TEMPLATES, 'event'))).toBe('3 files and 4 tasks')
  expect(describeTemplate(byId(ROADMAP_TEMPLATES, 'quarter'))).toBe('3 milestones and 3 initiatives')
  expect(describeTemplate(byId(SPRINT_TEMPLATES, 'one_week'))).toBe('7 days and 3 tasks')
})

test('defaultName is the template label, or a dated title for a sprint', () => {
  expect(defaultName(byId(PROJECT_TEMPLATES, 'software'), '2026-11-02')).toBe('Software project')
  expect(defaultName(byId(SPRINT_TEMPLATES, 'two_week'), '2026-11-02')).toBe('Sprint starting Nov 2')
})

test('partialFailureMessage says how far a stopped plan got', () => {
  expect(partialFailureMessage('Title is required.', 0, 9)).toBe('Title is required.')
  expect(partialFailureMessage('Unable to reach the server.', 3, 9)).toBe(
    'Unable to reach the server. 3 of 9 items were added before it stopped; finish or delete the rest by hand.',
  )
})

// A stand-in for the server: records each call as [kind, data] and hands out ids 1, 2, 3...
// The call with index `failAt` throws.
function fakeServer(failAt = Infinity) {
  const calls: [string, unknown][] = []
  const make = <T>(kind: string, data: T, result: unknown) => {
    if (calls.length === failAt) return Promise.reject(new Error('Server said no.'))
    calls.push([kind, data])
    return Promise.resolve(result)
  }
  const creators: Creators = {
    folder: (data) => make('folder', data, { id: 1 }) as Promise<{ id: number }>,
    document: (folderId, data) => make('document', { folderId, ...data }, null),
    task: (data) => make('task', data, null),
    milestone: (data) => make('milestone', data, { id: 10 + calls.length }) as Promise<{ id: number }>,
    initiative: (data) => make('initiative', data, null),
    sprint: (data) => make('sprint', data, { id: 5 }) as Promise<{ id: number }>,
  }
  return { calls, creators }
}

const reason = (error: unknown) => (error as Error).message

// The message a plan stopped with ('' when it did not stop).
async function stoppedWith(plan: Promise<void>): Promise<string> {
  try {
    await plan
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

test('a project plan makes the project folder, then its files and tasks inside it', async () => {
  const { calls, creators } = fakeServer()
  await applyPlan(planTemplate(byId(PROJECT_TEMPLATES, 'software'), { name: 'Billing', startDate: '2026-11-02' }), creators, reason)
  expect(calls[0]).toEqual(['folder', { name: 'Billing', kind: 'project' }])
  expect(calls[1]).toEqual(['document', { folderId: 1, title: 'Product requirements', doc_type: 'document' }])
  const tasks = calls.filter(([kind]) => kind === 'task')
  expect(tasks).toHaveLength(5)
  expect(tasks[0][1]).toEqual({ title: 'Write the product requirements', status: 'todo', position: 0, folder_id: 1 })
  expect(calls).toHaveLength(1 + 3 + 5)
})

test('a sprint plan makes the sprint, then dated tasks assigned to it', async () => {
  const { calls, creators } = fakeServer()
  await applyPlan(planTemplate(byId(SPRINT_TEMPLATES, 'two_week'), { startDate: '2026-11-02' }), creators, reason)
  expect(calls[0]).toEqual(['sprint', { title: 'Sprint starting Nov 2', start_date: '2026-11-02', end_date: '2026-11-15', status: 'planned' }])
  expect(calls[1]).toEqual(['task', { title: 'Sprint planning', status: 'todo', position: 0, dueDate: '2026-11-02', sprintId: 5 }])
  expect(calls).toHaveLength(5)
})

test('a roadmap plan makes each milestone before the initiative that points at it', async () => {
  const { calls, creators } = fakeServer()
  await applyPlan(planTemplate(byId(ROADMAP_TEMPLATES, 'quarter'), { startDate: '2026-11-02' }), creators, reason)
  expect(calls.map(([kind]) => kind)).toEqual(['milestone', 'initiative', 'milestone', 'initiative', 'milestone', 'initiative'])
  expect(calls[1][1]).toMatchObject({ milestone_id: 10, horizon: 'now' })
  expect(calls[3][1]).toMatchObject({ milestone_id: 12, horizon: 'next' })
})

test('a failure before anything was made reports only the reason', async () => {
  const { creators } = fakeServer(0)
  const plan = planTemplate(byId(SPRINT_TEMPLATES, 'two_week'), { startDate: '2026-11-02' })
  expect(await stoppedWith(applyPlan(plan, creators, reason))).toBe('Server said no.')
})

test('a failure part-way says how many records were made first', async () => {
  const { calls, creators } = fakeServer(2)
  const plan = planTemplate(byId(SPRINT_TEMPLATES, 'two_week'), { startDate: '2026-11-02' })
  expect(await stoppedWith(applyPlan(plan, creators, reason))).toBe(
    'Server said no. 2 of 5 items were added before it stopped; finish or delete the rest by hand.',
  )
  expect(calls).toHaveLength(2)
})

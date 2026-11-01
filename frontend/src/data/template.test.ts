import {
  PROJECT_TEMPLATES, ROADMAP_TEMPLATES, SPRINT_TEMPLATES, TEMPLATE_FORM,
  defaultName, describeTemplate, partialFailureMessage, planItemCount, planTemplate, templatesOf,
  type ItemTemplate, type ProjectPlan, type RoadmapPlan, type SprintPlan,
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
  expect(plan.tasks.map((t) => [t.title, t.due_date])).toEqual([
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
  expect(plan.tasks[plan.tasks.length - 1].due_date).toBe('2027-01-04')
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

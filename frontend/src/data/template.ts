import { format, parseISO } from 'date-fns'
import { addDays } from '@/util/calendar'
import type { Document, PlanningStatus, RoadmapHorizon } from '@/types'

// Built-in starter templates for projects, roadmaps and sprints, and the plan
// each one turns into, and the order a plan's records are made in. Everything
// here is pure: api/templates.ts hands it the model API classes to create
// records with, so what a template adds can be tested without a server.

export type TemplateKind = 'project' | 'roadmap' | 'sprint'

interface TemplateBase {
  id: string
  label: string
  description: string
}

export interface ProjectTemplate extends TemplateBase {
  kind: 'project'
  // Blank starter files, created inside the new project folder.
  documents: { title: string; doc_type: Document['doc_type'] }[]
  tasks: string[]
}

export interface RoadmapTemplate extends TemplateBase {
  kind: 'roadmap'
  // One milestone each, with an initiative working towards it. `weeks` is how
  // long after the start date the milestone falls.
  milestones: { title: string; description: string; weeks: number; initiative: string }[]
}

export interface SprintTemplate extends TemplateBase {
  kind: 'sprint'
  days: number
  // `day` is the 0-based day of the sprint a task is due; a negative day
  // counts back from the last one (-1 is the last day).
  tasks: { title: string; day: number }[]
}

export type ItemTemplate = ProjectTemplate | RoadmapTemplate | SprintTemplate

const doc = (title: string) => ({ title, doc_type: 'document' as const })
const sheet = (title: string) => ({ title, doc_type: 'spreadsheet' as const })

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software',
    kind: 'project',
    label: 'Software project',
    description: 'Requirements, a technical design and meeting notes, with the first tasks to get going.',
    documents: [doc('Product requirements'), doc('Technical design'), doc('Meeting notes')],
    tasks: [
      'Write the product requirements',
      'Review the technical design',
      'Plan the first milestone',
      'Set up the repository and environments',
      'Release and announce',
    ],
  },
  {
    id: 'campaign',
    kind: 'project',
    label: 'Marketing campaign',
    description: 'A brief, the messaging and a budget sheet, with the tasks from brief to results.',
    documents: [doc('Campaign brief'), doc('Messaging and audience'), sheet('Budget')],
    tasks: [
      'Write the campaign brief',
      'Agree the budget',
      'Create the assets',
      'Schedule the posts',
      'Review the results',
    ],
  },
  {
    id: 'event',
    kind: 'project',
    label: 'Event',
    description: 'A run of show, a guest list and a budget sheet, with the tasks to pull the event off.',
    documents: [doc('Run of show'), sheet('Guest list'), sheet('Budget')],
    tasks: ['Pick a date and venue', 'Send invitations', 'Confirm the schedule', 'Hold a debrief'],
  },
]

export const ROADMAP_TEMPLATES: RoadmapTemplate[] = [
  {
    id: 'launch',
    kind: 'roadmap',
    label: 'Product launch',
    description: 'Four milestones from discovery to launch over 20 weeks, each with an initiative.',
    milestones: [
      { title: 'Discovery done', description: 'Problem, users and scope agreed.', weeks: 3, initiative: 'Research and requirements' },
      { title: 'Alpha', description: 'The core features work end to end for the team.', weeks: 9, initiative: 'Build the core' },
      { title: 'Beta', description: 'Early users try it and give feedback.', weeks: 15, initiative: 'Beta and feedback' },
      { title: 'Launch', description: 'Public release.', weeks: 20, initiative: 'Launch and announce' },
    ],
  },
  {
    id: 'quarter',
    kind: 'roadmap',
    label: 'Quarterly plan',
    description: 'Three monthly milestones over 13 weeks, each with a focus initiative on Now, Next and Later.',
    milestones: [
      { title: 'End of month 1', description: 'What must be true after the first month.', weeks: 4, initiative: 'Month 1 focus' },
      { title: 'End of month 2', description: 'What must be true after the second month.', weeks: 8, initiative: 'Month 2 focus' },
      { title: 'End of quarter', description: 'What must be true at the end of the quarter.', weeks: 13, initiative: 'Month 3 focus' },
    ],
  },
]

export const SPRINT_TEMPLATES: SprintTemplate[] = [
  {
    id: 'two_week',
    kind: 'sprint',
    label: 'Two-week sprint',
    description: 'Planning, a mid-sprint check-in, a review and a retrospective over 14 days.',
    days: 14,
    tasks: [
      { title: 'Sprint planning', day: 0 },
      { title: 'Mid-sprint check-in', day: 7 },
      { title: 'Sprint review', day: -1 },
      { title: 'Retrospective', day: -1 },
    ],
  },
  {
    id: 'one_week',
    kind: 'sprint',
    label: 'One-week sprint',
    description: 'Planning, a review and a retrospective over 7 days.',
    days: 7,
    tasks: [
      { title: 'Sprint planning', day: 0 },
      { title: 'Sprint review', day: -1 },
      { title: 'Retrospective', day: -1 },
    ],
  },
]

const TEMPLATES: Record<TemplateKind, ItemTemplate[]> = {
  project: PROJECT_TEMPLATES,
  roadmap: ROADMAP_TEMPLATES,
  sprint: SPRINT_TEMPLATES,
}

export function templatesOf(kind: TemplateKind): ItemTemplate[] {
  return TEMPLATES[kind]
}

// What the picker asks for besides the template, and its wording, per kind.
export const TEMPLATE_FORM: Record<TemplateKind, { title: string; submit: string; name: boolean; startDate: boolean }> = {
  project: { title: 'New project from a template', submit: 'Create project', name: true, startDate: false },
  roadmap: { title: 'Add a roadmap from a template', submit: 'Add roadmap', name: false, startDate: true },
  sprint: { title: 'New sprint from a template', submit: 'Create sprint', name: true, startDate: true },
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

// What a template adds, in a few words ("3 documents and 5 tasks").
export function describeTemplate(template: ItemTemplate): string {
  switch (template.kind) {
    case 'project': {
      const files = count(template.documents.length, 'file')
      return `${files} and ${count(template.tasks.length, 'task')}`
    }
    case 'roadmap':
      return `${count(template.milestones.length, 'milestone')} and ${count(template.milestones.length, 'initiative')}`
    case 'sprint':
      return `${count(template.days, 'day')} and ${count(template.tasks.length, 'task')}`
  }
}

// What a sprint is called when its name is left empty.
export function defaultSprintTitle(startDate: string): string {
  return `Sprint starting ${format(parseISO(startDate), 'MMM d')}`
}

// What a new item is called when its name is left empty.
export function defaultName(template: ItemTemplate, startDate: string): string {
  return template.kind === 'sprint' ? defaultSprintTitle(startDate) : template.label
}

export interface TaskPlan {
  title: string
  status: 'todo'
  position: number
  dueDate?: string
}

export interface ProjectPlan {
  kind: 'project'
  folder: { name: string; kind: 'project' }
  documents: ProjectTemplate['documents']
  tasks: TaskPlan[]
}

export interface MilestonePlan {
  milestone: { title: string; description: string; target_date: string; status: PlanningStatus }
  initiative: { title: string; start_date: string; target_date: string; horizon: RoadmapHorizon; status: PlanningStatus }
}

export interface RoadmapPlan {
  kind: 'roadmap'
  milestones: MilestonePlan[]
}

export interface SprintPlan {
  kind: 'sprint'
  sprint: { title: string; start_date: string; end_date: string; status: PlanningStatus }
  tasks: TaskPlan[]
}

export type TemplatePlan = ProjectPlan | RoadmapPlan | SprintPlan

// The first milestone's initiative is Now, the second Next, the rest Later.
function horizonAt(index: number): RoadmapHorizon {
  return index === 0 ? 'now' : index === 1 ? 'next' : 'later'
}

const taskPlans = (titles: string[]): TaskPlan[] => titles.map((title, position): TaskPlan => ({ title, status: 'todo', position }))

// Everything a template creates, with its dates worked out from the start
// date (YYYY-MM-DD). A blank name falls back to the template's own.
export function planTemplate(template: ItemTemplate, options: { name?: string; startDate: string }): TemplatePlan {
  const { startDate } = options
  const name = options.name?.trim() || defaultName(template, startDate)
  switch (template.kind) {
    case 'project':
      return {
        kind: 'project',
        folder: { name, kind: 'project' },
        documents: template.documents,
        tasks: taskPlans(template.tasks),
      }
    case 'roadmap':
      return {
        kind: 'roadmap',
        milestones: template.milestones.map((item, index, all): MilestonePlan => {
          const target = addDays(startDate, item.weeks * 7)
          return {
            milestone: { title: item.title, description: item.description, target_date: target, status: 'planned' },
            initiative: {
              title: item.initiative,
              start_date: index === 0 ? startDate : addDays(startDate, all[index - 1].weeks * 7),
              target_date: target,
              horizon: horizonAt(index),
              status: 'planned',
            },
          }
        }),
      }
    case 'sprint': {
      const lastDay = template.days - 1
      return {
        kind: 'sprint',
        sprint: { title: name, start_date: startDate, end_date: addDays(startDate, lastDay), status: 'planned' },
        tasks: template.tasks.map((task, position): TaskPlan => ({
          title: task.title,
          status: 'todo',
          position,
          dueDate: addDays(startDate, task.day < 0 ? Math.max(0, template.days + task.day) : Math.min(task.day, lastDay)),
        })),
      }
    }
  }
}

// How many records a plan creates (its project, sprint or milestones included).
export function planItemCount(plan: TemplatePlan): number {
  switch (plan.kind) {
    case 'project':
      return 1 + plan.documents.length + plan.tasks.length
    case 'roadmap':
      return plan.milestones.length * 2
    case 'sprint':
      return 1 + plan.tasks.length
  }
}

// The error to show when a plan stops part-way: the reason, and how far it got
// (nothing is rolled back, so the user needs to know what already exists).
export function partialFailureMessage(reason: string, added: number, total: number): string {
  if (added === 0) return reason
  return `${reason} ${added} of ${total} items were added before it stopped; finish or delete the rest by hand.`
}

// How a plan's records are made. The API layer passes the model classes; tests
// pass stand-ins. Each one that others hang off returns the new record's id.
export interface Creators {
  folder(data: ProjectPlan['folder']): Promise<{ id: number }>
  document(folderId: number, data: ProjectPlan['documents'][number]): Promise<unknown>
  task(data: TaskPlan & { folder_id?: number; sprintId?: number }): Promise<unknown>
  milestone(data: MilestonePlan['milestone']): Promise<{ id: number }>
  initiative(data: MilestonePlan['initiative'] & { milestone_id: number }): Promise<unknown>
  sprint(data: SprintPlan['sprint']): Promise<{ id: number }>
}

// Creates what a plan lists, one request at a time and in order (each step
// needs the id of the one before). `added` is called after every record.
async function createAll(plan: TemplatePlan, create: Creators, added: () => void): Promise<void> {
  switch (plan.kind) {
    case 'project': {
      const folder = await create.folder(plan.folder)
      added()
      for (const file of plan.documents) {
        await create.document(folder.id, file)
        added()
      }
      for (const task of plan.tasks) {
        await create.task({ ...task, folder_id: folder.id })
        added()
      }
      return
    }
    case 'roadmap':
      for (const { milestone, initiative } of plan.milestones) {
        const created = await create.milestone(milestone)
        added()
        await create.initiative({ ...initiative, milestone_id: created.id })
        added()
      }
      return
    case 'sprint': {
      const sprint = await create.sprint(plan.sprint)
      added()
      for (const task of plan.tasks) {
        await create.task({ ...task, sprintId: sprint.id })
        added()
      }
    }
  }
}

// Carries a plan out. Nothing is rolled back when a request fails, so the error
// says how many records were made before it stopped; `reasonOf` turns whatever
// was thrown into text for the user.
export async function applyPlan(plan: TemplatePlan, create: Creators, reasonOf: (error: unknown) => string): Promise<void> {
  let done = 0
  try {
    await createAll(plan, create, () => { done += 1 })
  } catch (error) {
    throw new Error(partialFailureMessage(reasonOf(error), done, planItemCount(plan)))
  }
}

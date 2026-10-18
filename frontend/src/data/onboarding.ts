import type { Document } from '@/types'

// The getting-started checklist new accounts see on their Space home after
// signing up (components/onboarding/GettingStarted.tsx).
export type OnboardingStepId = 'space' | 'document' | 'sheet' | 'tasks' | 'invite' | 'roadmap'

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  description: string
  actionLabel: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'space',
    title: 'Create a Space',
    description: 'A Space keeps one project or team together: its documents, sheets, tasks and people. Your personal Space is just for you; make a new one for work you share.',
    actionLabel: 'New Space',
  },
  {
    id: 'document',
    title: 'Write a document',
    description: 'Notes, specs and plans with headings, lists and tables. Add a checklist and each item becomes a task.',
    actionLabel: 'New document',
  },
  {
    id: 'sheet',
    title: 'Start a Sheet',
    description: 'A spreadsheet with formulas for budgets, trackers and any numbers you work with.',
    actionLabel: 'New Sheet',
  },
  {
    id: 'tasks',
    title: 'Add your first tasks',
    description: 'Plan work on the task board, with statuses, due dates and sprints.',
    actionLabel: 'Add a task',
  },
  {
    id: 'invite',
    title: 'Invite a teammate',
    description: 'Add people to a Space so you can edit documents and share tasks together.',
    actionLabel: 'Add people',
  },
  {
    id: 'roadmap',
    title: 'Look at the roadmap',
    description: 'See epics, milestones and sprints laid out over time.',
    actionLabel: 'Open roadmap',
  },
]

// What the app already knows about the account, used to tick off steps the
// user did anywhere, not only from the checklist.
export interface OnboardingFacts {
  sharedSpaceCount: number
  docTypes: Document['doc_type'][]
  taskCount: number
  memberCount: number
}

const DETECTORS: Partial<Record<OnboardingStepId, (facts: OnboardingFacts) => boolean>> = {
  space: (f) => f.sharedSpaceCount > 0,
  document: (f) => f.docTypes.includes('document'),
  sheet: (f) => f.docTypes.includes('spreadsheet'),
  tasks: (f) => f.taskCount > 0,
  invite: (f) => f.memberCount > 1,
}

// Steps done now (from facts) or earlier (recorded), in checklist order.
// Recorded steps stay done after switching to a Space without that content.
export function completedSteps(facts: OnboardingFacts, recorded: OnboardingStepId[] = []): OnboardingStepId[] {
  return ONBOARDING_STEPS
    .map((s) => s.id)
    .filter((id) => recorded.includes(id) || !!DETECTORS[id]?.(facts))
}

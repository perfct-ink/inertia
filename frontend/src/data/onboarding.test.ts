import { completedSteps, ONBOARDING_STEPS, type OnboardingFacts } from './onboarding'

const none: OnboardingFacts = { sharedSpaceCount: 0, docTypes: [], taskCount: 0, memberCount: 1 }

test('a new account has nothing done', () => {
  expect(completedSteps(none)).toEqual([])
})

test('steps tick off from what the account already has, in checklist order', () => {
  const facts = { sharedSpaceCount: 1, docTypes: ['spreadsheet', 'document'] as const, taskCount: 2, memberCount: 2 }
  expect(completedSteps({ ...facts, docTypes: [...facts.docTypes] })).toEqual(['space', 'document', 'sheet', 'tasks', 'invite'])
})

test('a table does not count as a document or a sheet', () => {
  expect(completedSteps({ ...none, docTypes: ['table'] })).toEqual([])
})

test('recorded steps stay done, and the roadmap only ever comes from a record', () => {
  expect(completedSteps(none, ['roadmap', 'document'])).toEqual(['document', 'roadmap'])
  expect(ONBOARDING_STEPS.map((s) => s.id)).toContain('roadmap')
})

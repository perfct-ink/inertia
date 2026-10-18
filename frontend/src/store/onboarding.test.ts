import { useOnboardingStore } from './onboarding'

beforeEach(() => useOnboardingStore.setState({ users: {} }))

test('only accounts that signed up get a checklist', () => {
  useOnboardingStore.getState().record(1, ['space'])
  useOnboardingStore.getState().dismiss(1)
  expect(useOnboardingStore.getState().users).toEqual({})
})

test('records new steps once and remembers a dismissal', () => {
  const { start, record, dismiss } = useOnboardingStore.getState()
  start(1)
  record(1, ['space', 'document'])
  record(1, ['document', 'tasks'])
  expect(useOnboardingStore.getState().users[1]).toEqual({ dismissed: false, done: ['space', 'document', 'tasks'] })
  dismiss(1)
  expect(useOnboardingStore.getState().users[1].dismissed).toBe(true)
})

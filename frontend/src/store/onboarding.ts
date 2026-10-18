import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingStepId } from '@/data/onboarding'

interface Progress {
  dismissed: boolean
  done: OnboardingStepId[]
}

// Getting-started progress per account on this device. An account gets an
// entry when it signs up, so people who already use Inertia never see it.
interface OnboardingStore {
  users: Record<number, Progress>
  start: (userId: number) => void
  record: (userId: number, steps: OnboardingStepId[]) => void
  dismiss: (userId: number) => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      users: {},
      start: (userId) => set((s) => ({ users: { ...s.users, [userId]: { dismissed: false, done: [] } } })),
      record: (userId, steps) => set((s) => {
        const current = s.users[userId]
        if (!current) return s
        const added = steps.filter((id) => !current.done.includes(id))
        if (!added.length) return s
        return { users: { ...s.users, [userId]: { ...current, done: [...current.done, ...added] } } }
      }),
      dismiss: (userId) => set((s) => {
        const current = s.users[userId]
        return current ? { users: { ...s.users, [userId]: { ...current, dismissed: true } } } : s
      }),
    }),
    { name: 'inertia-onboarding' }
  )
)

// The signed-in account's checklist progress while it should be shown.
export function useActiveOnboarding(userId: number | undefined): Progress | null {
  const progress = useOnboardingStore((s) => (userId == null ? undefined : s.users[userId]))
  return progress && !progress.dismissed ? progress : null
}

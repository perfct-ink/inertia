import api from '@/lib/api'
import type { OnboardingProgress } from '@/data/onboarding'

// The signed-in person's checklist progress on the server, or null if they never saved any.
export function fetchOnboarding(): Promise<OnboardingProgress | null> {
  return api.get('/api/v1/onboarding').then((r) => r.data.onboarding)
}

export function saveOnboarding(progress: OnboardingProgress): Promise<OnboardingProgress> {
  return api.put('/api/v1/onboarding', { onboarding: progress }).then((r) => r.data.onboarding)
}

import { useEffect, useRef, useState } from 'react'
import { fetchOnboarding, saveOnboarding } from '@/api/onboarding'
import { mergeOnboarding, sameOnboarding, type OnboardingProgress } from '@/data/onboarding'
import { useAuthStore } from '@/store/auth'
import { useOnboardingStore } from '@/store/onboarding'

// Keeps the getting-started checklist in step with the server so it follows the
// person to another device or the Mac app. On sign-in it merges the server's copy
// into this device's; after that every local change is saved (debounced). It
// renders nothing. Failures show the usual error notice and are retried on the
// next change.
export default function OnboardingSync() {
  const userId = useAuthStore((s) => s.user?.id)
  const progress = useOnboardingStore((s) => (userId == null ? undefined : s.users[userId]))
  const [hydratedFor, setHydratedFor] = useState<number | null>(null)
  const lastSynced = useRef<OnboardingProgress | null>(null)

  useEffect(() => {
    if (userId == null) { setHydratedFor(null); return }
    let cancelled = false
    fetchOnboarding().then((server) => {
      if (cancelled) return
      const merged = mergeOnboarding(useOnboardingStore.getState().users[userId], server)
      lastSynced.current = server
      if (merged) useOnboardingStore.getState().replace(userId, merged)
      setHydratedFor(userId)
    }).catch(() => { /* the API client already showed the error */ })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (userId == null || hydratedFor !== userId || !progress || sameOnboarding(progress, lastSynced.current)) return
    const timer = setTimeout(() => {
      saveOnboarding(progress).then((saved) => { lastSynced.current = saved }).catch(() => { /* error already shown; retried on the next change */ })
    }, 500)
    return () => clearTimeout(timer)
  }, [progress, userId, hydratedFor])

  return null
}

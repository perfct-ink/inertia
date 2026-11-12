import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { readTasksOnly, tasksOnlyKey, writeTasksOnly } from '@/data/feature'

// Whether a document is folded down to its task lines. For a feature's
// requirements document (`epicId`) the choice is remembered per person in
// local storage, so the feature reopens the way it was left; for any other
// document it lasts as long as the page.
export function useTasksOnly(epicId: number | undefined): [boolean, () => void] {
  const userId = useAuthStore((s) => s.user?.id)
  const key = epicId ? tasksOnlyKey(userId, epicId) : null
  const [on, setOn] = useState(false)

  // The feature is known once the epics have loaded, so its stored choice is read then.
  useEffect(() => {
    if (key) setOn(readTasksOnly(localStorage, key))
  }, [key])

  function toggle() {
    const next = !on
    setOn(next)
    if (key) writeTasksOnly(localStorage, key, next)
  }

  return [on, toggle]
}

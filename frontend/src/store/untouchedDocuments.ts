// Documents created from "new document" that nobody has typed in or renamed
// yet. Closing their tab discards them (see lib/closeTab.ts) instead of
// leaving an empty "Untitled Document" behind. Kept in memory only: after a
// reload a new document is kept like any other.
const untouched = new Set<number>()

export const markUntouched = (id: number) => { untouched.add(id) }
export const markTouched = (id: number) => { untouched.delete(id) }
export const isUntouched = (id: number) => untouched.has(id)

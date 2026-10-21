// "Ada Lovelace" -> "AL"; a single name gives one letter. Used for the small
// avatars that show who a task is assigned to.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]]
  return letters.map((p) => p[0].toUpperCase()).join('')
}

// Adds the id when it is missing and removes it when it is there.
export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
}

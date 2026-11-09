import { colorForUserId } from '@/util/color'

// Who else is looking at a folder right now (the live `folder-<id>` room, see
// collab-server/src/rooms.ts), and the word the room sends when something in
// the folder changed. Kept here so the screen, the hook and their tests agree.
export const FOLDER_CHANGED = 'changed'

export interface RoomPerson {
  id: number
  name: string
  color: string
}

// What a client puts in its awareness state.
export const presenceField = (user: { id: number; name: string }): RoomPerson => ({
  id: user.id, name: user.name, color: colorForUserId(user.id),
})

// The people in a room from its awareness states: everyone but the signed-in
// user (their other tabs included), each person once however many tabs they
// have open, by name.
export function otherPeople(states: Iterable<Record<string, unknown>>, meId: number): RoomPerson[] {
  const byId = new Map<number, RoomPerson>()
  for (const state of states) {
    const person = state.user as Partial<RoomPerson> | undefined
    if (typeof person?.id !== 'number' || typeof person.name !== 'string' || person.id === meId) continue
    byId.set(person.id, { id: person.id, name: person.name, color: person.color ?? colorForUserId(person.id) })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id)
}

// Up to two letters for an avatar.
export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || '?'
}

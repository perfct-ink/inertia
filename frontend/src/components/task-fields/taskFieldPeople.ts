import { createContext } from 'react'

// The Space's members by user id, for the chips of person fields and a formula's
// Assignee. A screen that already loads the members provides it; without it a
// person shows as "Member #id".
export const TaskFieldPeople = createContext<ReadonlyMap<number, string> | undefined>(undefined)

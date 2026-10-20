// Keeping a document's task line and its Space task the same item. The task is
// the source of truth; the line is a live reference to it. Each side is compared
// with `known`, the title both agreed on last time, so we can tell which side
// changed (a three-way comparison, the same idea as merging).

export interface TitleReconcile {
  // 'toTask': the line was edited, save its text as the task title.
  // 'toLine': the task was renamed elsewhere, show its title in the line.
  action: 'none' | 'toTask' | 'toLine'
  // The title to write (for 'toTask' / 'toLine'); otherwise the agreed title.
  value: string
  // The new agreed title to remember.
  known: string
}

export function reconcileTitle(lineText: string, taskTitle: string, known: string | undefined): TitleReconcile {
  const line = lineText.trim()
  // First time we see this pair: the task wins if they differ.
  if (known === undefined) {
    return line === taskTitle ? { action: 'none', value: taskTitle, known: taskTitle } : { action: 'toLine', value: taskTitle, known: taskTitle }
  }
  // The task changed since last time (even if the line did too): the task wins.
  if (taskTitle !== known) {
    return line === taskTitle ? { action: 'none', value: taskTitle, known: taskTitle } : { action: 'toLine', value: taskTitle, known: taskTitle }
  }
  // Only the line changed. A blank line is never saved as a blank title.
  if (line !== known && line !== '') return { action: 'toTask', value: line, known: line }
  return { action: 'none', value: known, known }
}

// Task ids that were on lines last time and are not now, but still exist as
// tasks: lines the person deleted, where we should ask what to do with the task.
export function removedLineTaskIds(previous: Set<number>, current: Set<number>, existingTaskIds: Set<number>): number[] {
  return [...previous].filter((id) => !current.has(id) && existingTaskIds.has(id))
}

// The next status when a line's checkbox is clicked: checked means done.
export function statusForCheckbox(checked: boolean): 'done' | 'todo' {
  return checked ? 'done' : 'todo'
}

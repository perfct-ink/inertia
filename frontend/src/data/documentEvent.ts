import type { WorkspaceEvent } from '@/types'

export const EVENT_TYPE_LABEL: Record<WorkspaceEvent['event_type'], string> = { milestone: 'Milestone', deadline: 'Deadline' }

// The body to POST for an event made in a document: it records the document and
// puts the event in the document's folder so folder views show it too.
export function documentEventPayload(
  event: { title: string; date: string; event_type: WorkspaceEvent['event_type'] },
  document: { id: number; folder_id: number },
) {
  return { ...event, document_id: document.id, folder_id: document.folder_id }
}

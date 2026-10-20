import { documentEventPayload, EVENT_TYPE_LABEL } from './documentEvent'

test('the payload links the event to the document and its folder', () => {
  expect(documentEventPayload({ title: 'Beta', date: '2026-12-01', event_type: 'milestone' }, { id: 9, folder_id: 4 }))
    .toEqual({ title: 'Beta', date: '2026-12-01', event_type: 'milestone', document_id: 9, folder_id: 4 })
})

test('both event types have a label', () => {
  expect(EVENT_TYPE_LABEL).toEqual({ milestone: 'Milestone', deadline: 'Deadline' })
})

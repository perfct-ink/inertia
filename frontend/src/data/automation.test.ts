import {
  AUTOMATION_ACTIONS,
  AUTOMATION_FIELDS,
  AUTOMATION_FIELD_KEYS,
  AUTOMATION_LIMITS,
  AUTOMATION_TRIGGERS,
  changeConditionField,
  changeConditionOperator,
  describeAction,
  describeCondition,
  describeRule,
  describeTrigger,
  draftError,
  draftFromRule,
  emptyDraft,
  fieldOptions,
  newAction,
  newCondition,
  operatorsFor,
  optionValue,
  ruleInput,
  rulesLeft,
  storedValue,
  toggleConditionValue,
  valueLabel,
  type AutomationContext,
  type AutomationDraft,
} from './automation'
import { resolveStatuses } from './task_status'

const context: AutomationContext = {
  statuses: resolveStatuses([{ id: 1, folder_id: null, status: 'todo', label: 'Next up', color: null }], []),
  people: [{ id: 7, name: 'Ada' }, { id: 9, name: 'Bo' }],
}

const draft = (over: Partial<AutomationDraft> = {}): AutomationDraft => ({
  name: 'Finished work goes to Ada',
  trigger_type: 'task_status_changed',
  trigger_config: { to: 'done' },
  conditions: [{ field: 'priority', operator: 'in', value: ['high', 'urgent'] }],
  actions: [{ type: 'assign', config: { user_id: 7 } }],
  ...over,
})

test('the registries list one trigger, three fields and two actions that point at known fields', () => {
  expect(AUTOMATION_TRIGGERS.map((t) => t.type)).toEqual(['task_status_changed'])
  expect(AUTOMATION_FIELD_KEYS).toEqual(['status', 'priority', 'assignee_id'])
  expect(AUTOMATION_ACTIONS.map((a) => a.type)).toEqual(['set_status', 'assign'])
  for (const def of [...AUTOMATION_TRIGGERS, ...AUTOMATION_ACTIONS]) {
    for (const param of def.params) expect(AUTOMATION_FIELD_KEYS).toContain(param.field)
  }
})

test('a field offers its options, with the Space\'s own status names and its people', () => {
  expect(fieldOptions('status', context).map((o) => o.label)).toEqual(['Backlog', 'Next up', 'In Progress', 'In Review', 'Done'])
  expect(fieldOptions('status').map((o) => o.value)).toEqual(['backlog', 'todo', 'in_progress', 'in_review', 'done'])
  expect(fieldOptions('priority').map((o) => o.value)).toEqual(['none', 'low', 'medium', 'high', 'urgent'])
  expect(fieldOptions('assignee_id', context)).toEqual([
    { value: '', label: 'Unassigned' },
    { value: '7', label: 'Ada' },
    { value: '9', label: 'Bo' },
  ])
  expect(fieldOptions('assignee_id')).toEqual([{ value: '', label: 'Unassigned' }])
})

test('select strings convert to stored values and back', () => {
  expect(storedValue('assignee_id', '7')).toBe(7)
  expect(storedValue('assignee_id', '')).toBeNull()
  expect(storedValue('status', 'done')).toBe('done')
  expect(storedValue('status', '')).toBeNull()
  expect(optionValue(7)).toBe('7')
  expect(optionValue(null)).toBe('')
  expect(optionValue(undefined)).toBe('')
  expect(optionValue('done')).toBe('done')
})

test('a value is labelled by its option, or by a stand-in when the option is gone', () => {
  expect(valueLabel('status', 'todo', context)).toBe('Next up')
  expect(valueLabel('assignee_id', 7, context)).toBe('Ada')
  expect(valueLabel('assignee_id', null, context)).toBe('Unassigned')
  expect(valueLabel('assignee_id', 99, context)).toBe('Unknown person')
  expect(valueLabel('priority', 'urgent')).toBe('Urgent')
})

test('people are compared with is and is not; options can also be listed', () => {
  expect(operatorsFor('status')).toEqual(['equals', 'not_equals', 'in'])
  expect(operatorsFor('priority')).toEqual(['equals', 'not_equals', 'in'])
  expect(operatorsFor('assignee_id')).toEqual(['equals', 'not_equals'])
})

test('new conditions and actions start on a valid first option', () => {
  expect(newCondition()).toEqual({ field: 'status', operator: 'equals', value: 'backlog' })
  expect(newCondition('assignee_id', context)).toEqual({ field: 'assignee_id', operator: 'equals', value: null })
  expect(newAction()).toEqual({ type: 'set_status', config: { value: 'backlog' } })
  expect(newAction('assign', context)).toEqual({ type: 'assign', config: { user_id: null } })
  expect(emptyDraft()).toEqual({ name: '', trigger_type: 'task_status_changed', trigger_config: {}, conditions: [], actions: [newAction()] })
})

test('picking another field restarts the condition, picking the same one keeps it', () => {
  const condition = { field: 'status' as const, operator: 'not_equals' as const, value: 'done' }
  expect(changeConditionField(condition, 'status')).toBe(condition)
  expect(changeConditionField(condition, 'priority')).toEqual({ field: 'priority', operator: 'equals', value: 'none' })
})

test('"is any of" turns a value into a list and back into its first value', () => {
  const equals = { field: 'priority' as const, operator: 'equals' as const, value: 'high' }
  const among = changeConditionOperator(equals, 'in')
  expect(among).toEqual({ field: 'priority', operator: 'in', value: ['high'] })
  expect(changeConditionOperator({ ...among, value: ['urgent', 'high'] }, 'not_equals')).toEqual({ field: 'priority', operator: 'not_equals', value: 'urgent' })
  expect(changeConditionOperator({ ...among, value: [] }, 'equals').value).toBe('none')
  expect(changeConditionOperator({ field: 'status', operator: 'equals', value: null }, 'in').value).toEqual([])
})

test('ticking options builds the list in option order', () => {
  let condition = { field: 'status' as const, operator: 'in' as const, value: [] as (string | number | null)[] }
  condition = toggleConditionValue(condition, 'done') as typeof condition
  condition = toggleConditionValue(condition, 'todo') as typeof condition
  expect(condition.value).toEqual(['todo', 'done'])
  condition = toggleConditionValue(condition, 'done') as typeof condition
  expect(condition.value).toEqual(['todo'])
})

test('a complete draft has no error', () => {
  expect(draftError(draft())).toBeNull()
  expect(draftError(draft({ trigger_config: {}, conditions: [] }))).toBeNull()
  expect(draftError(draft({ actions: [{ type: 'assign', config: { user_id: null } }] }))).toBeNull()
  expect(draftError({ ...emptyDraft(), name: 'Starter' })).toBeNull()
})

test('the name is needed and limited', () => {
  expect(draftError(draft({ name: '  ' }))).toBe('Give the automation a name.')
  expect(draftError(draft({ name: 'x'.repeat(AUTOMATION_LIMITS.nameLength + 1) }))).toBe('The name can be at most 80 characters.')
  expect(draftError(draft({ name: 'x'.repeat(AUTOMATION_LIMITS.nameLength) }))).toBeNull()
})

test('the trigger and its settings must be valid', () => {
  expect(draftError(draft({ trigger_type: 'nope' as never }))).toBe('Pick what starts the automation.')
  expect(draftError(draft({ trigger_config: { to: 'finished' } }))).toBe('The to status is not valid.')
  expect(draftError(draft({ trigger_config: { from: '', to: null } }))).toBeNull()
})

test('each condition is checked and named by its position', () => {
  const ok = { field: 'status' as const, operator: 'equals' as const, value: 'done' }
  expect(draftError(draft({ conditions: [ok, { field: 'priority', operator: 'equals', value: 'huge' }] }))).toBe('Condition 2: pick a priority.')
  expect(draftError(draft({ conditions: [{ field: 'title' as never, operator: 'equals', value: 'x' }] }))).toBe('Condition 1: pick a field to check.')
  expect(draftError(draft({ conditions: [{ field: 'assignee_id', operator: 'in', value: [7] }] }))).toBe('Condition 1: pick how to compare assignee.')
  expect(draftError(draft({ conditions: [{ field: 'status', operator: 'in', value: [] }] }))).toBe('Condition 1: tick the status values to match.')
  expect(draftError(draft({ conditions: [{ field: 'status', operator: 'in', value: ['done', 'bogus'] }] }))).toBe('Condition 1: has a status that is not valid.')
  expect(draftError(draft({ conditions: [{ field: 'status', operator: 'equals', value: ['done'] }] }))).toBe('Condition 1: pick a status.')
  expect(draftError(draft({ conditions: [{ field: 'assignee_id', operator: 'equals', value: null }] }))).toBeNull()
  expect(draftError(draft({ conditions: Array.from({ length: 11 }, () => ok) }))).toBe('Use at most 10 conditions.')
})

test('a rule needs at least one action and at most five, each valid', () => {
  const action = { type: 'set_status' as const, config: { value: 'done' } }
  expect(draftError(draft({ actions: [] }))).toBe('Add at least one action.')
  expect(draftError(draft({ actions: Array.from({ length: 6 }, () => action) }))).toBe('Use at most 5 actions.')
  expect(draftError(draft({ actions: [action, { type: 'set_status', config: { value: 'finished' } }] }))).toBe('Action 2: pick a valid status.')
  expect(draftError(draft({ actions: [{ type: 'assign', config: {} }] }))).toBe('Action 1: pick a valid person.')
  expect(draftError(draft({ actions: [{ type: 'assign', config: { user_id: 'me' as never } }] }))).toBe('Action 1: pick a valid person.')
  expect(draftError(draft({ actions: [{ type: 'delete' as never, config: {} }] }))).toBe('Action 1: pick what to do.')
})

test('what is sent has the name trimmed and the "any" settings left out', () => {
  expect(ruleInput(draft({ name: '  Done to Ada ', trigger_config: { from: null, to: 'done' } }))).toMatchObject({ name: 'Done to Ada', trigger_config: { to: 'done' } })
  expect(ruleInput(draft({ trigger_config: { from: '', to: null } })).trigger_config).toEqual({})
})

test('editing a copy leaves the saved rule alone', () => {
  const rule = draft()
  const copy = draftFromRule(rule)
  copy.trigger_config.to = 'todo'
  ;(copy.conditions[0].value as string[]).push('low')
  copy.actions[0].config.user_id = 9
  expect(rule.trigger_config.to).toBe('done')
  expect(rule.conditions[0].value).toEqual(['high', 'urgent'])
  expect(rule.actions[0].config.user_id).toBe(7)
})

test('a rule is described in words, in the Space\'s own names', () => {
  expect(describeTrigger('task_status_changed', {}, context)).toBe("a task's status changes")
  expect(describeTrigger('task_status_changed', { from: 'todo', to: 'done' }, context)).toBe("a task's status changes from Next up to Done")
  expect(describeTrigger('task_status_changed', { to: 'done' })).toBe("a task's status changes to Done")
  expect(describeCondition({ field: 'priority', operator: 'in', value: ['high', 'urgent'] })).toBe('Priority is any of High, Urgent')
  expect(describeCondition({ field: 'assignee_id', operator: 'not_equals', value: null }, context)).toBe('Assignee is not Unassigned')
  expect(describeCondition({ field: 'assignee_id', operator: 'equals', value: 9 }, context)).toBe('Assignee is Bo')
  expect(describeAction({ type: 'assign', config: { user_id: 7 } }, context)).toBe('Assign to Ada')
  expect(describeAction({ type: 'set_status', config: { value: 'in_review' } })).toBe('Change status to In Review')
  expect(describeRule(draft(), context)).toEqual({
    when: "a task's status changes to Done",
    conditions: ['Priority is any of High, Urgent'],
    then: ['Assign to Ada'],
  })
})

test('the Space is limited in how many automations it has', () => {
  expect(rulesLeft([])).toBe(50)
  expect(rulesLeft(new Array(49))).toBe(1)
  expect(rulesLeft(new Array(60))).toBe(0)
})

test('the built-in status names are used until a context says otherwise', () => {
  expect(fieldOptions('status').map((o) => o.label)).toEqual(['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'])
  expect(AUTOMATION_FIELDS.status.kind).toBe('enum')
})

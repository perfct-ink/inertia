import { TASK_PRIORITIES } from './task'
import { DEFAULT_BOARD_STATUSES, TASK_STATUSES, type BoardStatuses } from './task_status'

// Automations: rules a Space runs on its own, "when this happens, and these are
// true, do that". Everything here mirrors the server (AutomationRule and
// Automations::Registry): the option lists the rule builder offers, the rule
// as the API sends it, the checks run before saving, and the sentences that
// describe a rule. To add a trigger, field or action, add its entry to the
// registries below (and to the server's) and the builder offers it.

export type AutomationFieldKey = 'status' | 'priority' | 'assignee_id'
export type ConditionOperator = 'equals' | 'not_equals' | 'in'
export type AutomationTriggerType = 'task_status_changed'
export type AutomationActionType = 'set_status' | 'assign'

// An option's value, a person's id, or null (nothing chosen, or nobody).
export type AutomationScalar = string | number | null

export interface AutomationCondition {
  field: AutomationFieldKey
  operator: ConditionOperator
  // One value, or a list for "is any of".
  value: AutomationScalar | AutomationScalar[]
}

export interface AutomationAction {
  type: AutomationActionType
  config: Record<string, AutomationScalar>
}

// What the builder edits and the API takes (the Rails param is `automation_rule`).
export interface AutomationDraft {
  name: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, AutomationScalar>
  conditions: AutomationCondition[]
  actions: AutomationAction[]
}

export interface AutomationRuleInput extends AutomationDraft {
  enabled?: boolean
}

// Mirrors AutomationRuleBlueprint.
export interface AutomationRule extends AutomationDraft {
  id: number
  enabled: boolean
  created_by_id: number | null
  created_at: string
  updated_at: string
}

// A task field a condition can test or an action can set. `enum` fields pick
// from a fixed list, `user` fields pick a person of the Space (or nobody).
export const AUTOMATION_FIELDS: Record<AutomationFieldKey, { label: string; kind: 'enum' | 'user' }> = {
  status: { label: 'Status', kind: 'enum' },
  priority: { label: 'Priority', kind: 'enum' },
  assignee_id: { label: 'Assignee', kind: 'user' },
}

export const AUTOMATION_FIELD_KEYS = Object.keys(AUTOMATION_FIELDS) as AutomationFieldKey[]

// A setting of a trigger or action: where it is kept in the config, and which
// field's options it picks from. A trigger's settings may be left on "any".
export interface AutomationParam {
  key: string
  field: AutomationFieldKey
  label: string
  anyLabel?: string
}

export interface AutomationTriggerDef {
  type: AutomationTriggerType
  label: string
  params: AutomationParam[]
}

export interface AutomationActionDef {
  type: AutomationActionType
  label: string
  params: AutomationParam[]
}

export const AUTOMATION_TRIGGERS: AutomationTriggerDef[] = [
  {
    type: 'task_status_changed',
    label: "A task's status changes",
    params: [
      { key: 'from', field: 'status', label: 'From', anyLabel: 'Any status' },
      { key: 'to', field: 'status', label: 'To', anyLabel: 'Any status' },
    ],
  },
]

export const AUTOMATION_ACTIONS: AutomationActionDef[] = [
  { type: 'set_status', label: 'Change status to', params: [{ key: 'value', field: 'status', label: 'Status' }] },
  { type: 'assign', label: 'Assign to', params: [{ key: 'user_id', field: 'assignee_id', label: 'Person' }] },
]

export const CONDITION_OPERATOR_LABEL: Record<ConditionOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  in: 'is any of',
}

// Mirror Automations::Registry on the server.
export const AUTOMATION_LIMITS = {
  rulesPerSpace: 50,
  conditionsPerRule: 10,
  actionsPerRule: 5,
  valuesPerCondition: 20,
  nameLength: 80,
}

// What the options are built from: how the Space names its statuses and who is in it.
export interface AutomationContext {
  statuses: BoardStatuses
  people: { id: number; name: string }[]
}

export const DEFAULT_AUTOMATION_CONTEXT: AutomationContext = { statuses: DEFAULT_BOARD_STATUSES, people: [] }

// An option as a <select> holds it: `value` is a string (the id of a person, or
// '' for nobody).
export interface AutomationOption {
  value: string
  label: string
}

export function fieldOptions(field: AutomationFieldKey, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationOption[] {
  if (field === 'status') return TASK_STATUSES.map((status) => ({ value: status, label: context.statuses[status].label }))
  if (field === 'priority') return TASK_PRIORITIES.map(({ value, label }) => ({ value, label }))
  return [{ value: '', label: 'Unassigned' }, ...context.people.map((person) => ({ value: String(person.id), label: person.name }))]
}

// The string a <select> holds for a stored value.
export function optionValue(value: AutomationScalar | undefined): string {
  return value == null ? '' : String(value)
}

// The stored value for a <select>'s string: a person's id, nobody, or an option.
// An enum's '' is "nothing chosen" (a trigger's "any").
export function storedValue(field: AutomationFieldKey, option: string): AutomationScalar {
  if (option === '') return null
  return AUTOMATION_FIELDS[field].kind === 'user' ? Number(option) : option
}

// The label of a stored value, or a stand-in if it is no longer an option (for
// example a person who left the Space).
export function valueLabel(field: AutomationFieldKey, value: AutomationScalar | undefined, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): string {
  const option = fieldOptions(field, context).find((o) => o.value === optionValue(value))
  if (option) return option.label
  return value == null ? 'Unassigned' : AUTOMATION_FIELDS[field].kind === 'user' ? 'Unknown person' : String(value)
}

// "is any of" lists the options of an enum; a person is compared with is / is not.
export function operatorsFor(field: AutomationFieldKey): ConditionOperator[] {
  return AUTOMATION_FIELDS[field].kind === 'user' ? ['equals', 'not_equals'] : ['equals', 'not_equals', 'in']
}

export const triggerDef = (type: AutomationTriggerType) => AUTOMATION_TRIGGERS.find((t) => t.type === type)
export const actionDef = (type: AutomationActionType) => AUTOMATION_ACTIONS.find((a) => a.type === type)

// The first option of a field, which is what a new condition or action starts on.
function firstValue(field: AutomationFieldKey, context: AutomationContext): AutomationScalar {
  return storedValue(field, fieldOptions(field, context)[0]?.value ?? '')
}

export function newCondition(field: AutomationFieldKey = 'status', context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationCondition {
  return { field, operator: 'equals', value: firstValue(field, context) }
}

export function newAction(type: AutomationActionType = 'set_status', context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationAction {
  const params = actionDef(type)?.params ?? []
  return { type, config: Object.fromEntries(params.map((param) => [param.key, firstValue(param.field, context)])) }
}

export function emptyDraft(): AutomationDraft {
  return { name: '', trigger_type: 'task_status_changed', trigger_config: {}, conditions: [], actions: [newAction()] }
}

// A copy of a saved rule to edit (the rule itself is left as it is).
export function draftFromRule(rule: AutomationDraft): AutomationDraft {
  return {
    name: rule.name,
    trigger_type: rule.trigger_type,
    trigger_config: { ...rule.trigger_config },
    conditions: rule.conditions.map((c) => ({ ...c, value: Array.isArray(c.value) ? [...c.value] : c.value })),
    actions: rule.actions.map((a) => ({ type: a.type, config: { ...a.config } })),
  }
}

// What to send: the name trimmed and trigger settings left on "any" left out.
export function ruleInput(draft: AutomationDraft): AutomationDraft {
  const config = Object.fromEntries(Object.entries(draft.trigger_config).filter(([, value]) => value != null && value !== ''))
  return { ...draft, name: draft.name.trim(), trigger_config: config }
}

// Picking another field starts its condition over: operators and values differ per field.
export function changeConditionField(condition: AutomationCondition, field: AutomationFieldKey, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationCondition {
  return condition.field === field ? condition : newCondition(field, context)
}

// A single value becomes a list of one for "is any of", and a list becomes its first value.
export function changeConditionOperator(condition: AutomationCondition, operator: ConditionOperator, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationCondition {
  const { value } = condition
  if (operator === 'in') return { ...condition, operator, value: Array.isArray(value) ? value : value == null ? [] : [value] }
  const first = Array.isArray(value) ? value[0] : value
  return { ...condition, operator, value: first ?? firstValue(condition.field, context) }
}

// Adds an option to an "is any of" list, or takes it out when it is there, keeping option order.
export function toggleConditionValue(condition: AutomationCondition, option: string, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): AutomationCondition {
  const current = (Array.isArray(condition.value) ? condition.value : []).map(optionValue)
  const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
  const ordered = fieldOptions(condition.field, context).map((o) => o.value).filter((o) => next.includes(o))
  return { ...condition, value: ordered.map((o) => storedValue(condition.field, o)) }
}

const isOption = (field: AutomationFieldKey, value: AutomationScalar | undefined) =>
  AUTOMATION_FIELDS[field].kind === 'user'
    ? value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0)
    : typeof value === 'string' && fieldOptions(field).some((o) => o.value === value)

// The first thing wrong with a draft, in words, or null when it can be saved.
// Mirrors Automations::Definition and the model, which have the last word.
export function draftError(draft: AutomationDraft): string | null {
  const name = draft.name.trim()
  if (!name) return 'Give the automation a name.'
  if (name.length > AUTOMATION_LIMITS.nameLength) return `The name can be at most ${AUTOMATION_LIMITS.nameLength} characters.`

  const trigger = triggerDef(draft.trigger_type)
  if (!trigger) return 'Pick what starts the automation.'
  for (const param of trigger.params) {
    const value = draft.trigger_config[param.key]
    if (value != null && value !== '' && !isOption(param.field, value)) return `The ${param.label.toLowerCase()} status is not valid.`
  }

  if (draft.conditions.length > AUTOMATION_LIMITS.conditionsPerRule) return `Use at most ${AUTOMATION_LIMITS.conditionsPerRule} conditions.`
  for (const [index, condition] of draft.conditions.entries()) {
    const problem = conditionError(condition)
    if (problem) return `Condition ${index + 1}: ${problem}.`
  }

  if (draft.actions.length === 0) return 'Add at least one action.'
  if (draft.actions.length > AUTOMATION_LIMITS.actionsPerRule) return `Use at most ${AUTOMATION_LIMITS.actionsPerRule} actions.`
  for (const [index, action] of draft.actions.entries()) {
    const problem = actionError(action)
    if (problem) return `Action ${index + 1}: ${problem}.`
  }
  return null
}

function conditionError(condition: AutomationCondition): string | null {
  const field = AUTOMATION_FIELDS[condition.field]
  if (!field) return 'pick a field to check'
  if (!operatorsFor(condition.field).includes(condition.operator)) return `pick how to compare ${field.label.toLowerCase()}`
  if (condition.operator !== 'in') return isOption(condition.field, Array.isArray(condition.value) ? undefined : condition.value) ? null : `pick a ${field.label.toLowerCase()}`
  const list = Array.isArray(condition.value) ? condition.value : []
  if (list.length === 0) return `tick the ${field.label.toLowerCase()} values to match`
  if (list.length > AUTOMATION_LIMITS.valuesPerCondition) return `tick at most ${AUTOMATION_LIMITS.valuesPerCondition} values`
  return list.every((value) => value != null && isOption(condition.field, value)) ? null : `has a ${field.label.toLowerCase()} that is not valid`
}

function actionError(action: AutomationAction): string | null {
  const definition = actionDef(action.type)
  if (!definition) return 'pick what to do'
  const bad = definition.params.find((param) => !(param.key in action.config) || !isOption(param.field, action.config[param.key]))
  return bad ? `pick a valid ${bad.label.toLowerCase()}` : null
}

// "a task's status changes from To Do to Done"
export function describeTrigger(type: AutomationTriggerType, config: Record<string, AutomationScalar>, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): string {
  const trigger = triggerDef(type)
  if (!trigger) return 'something happens'
  const parts = trigger.params
    .filter((param) => config[param.key] != null && config[param.key] !== '')
    .map((param) => `${param.label.toLowerCase()} ${valueLabel(param.field, config[param.key], context)}`)
  return [trigger.label.charAt(0).toLowerCase() + trigger.label.slice(1), ...parts].join(' ')
}

// "Priority is any of High, Urgent"
export function describeCondition(condition: AutomationCondition, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): string {
  const values = Array.isArray(condition.value) ? condition.value : [condition.value]
  const names = values.map((value) => valueLabel(condition.field, value, context)).join(', ')
  return `${AUTOMATION_FIELDS[condition.field]?.label ?? condition.field} ${CONDITION_OPERATOR_LABEL[condition.operator] ?? condition.operator} ${names}`
}

// "Assign to Ada"
export function describeAction(action: AutomationAction, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): string {
  const definition = actionDef(action.type)
  if (!definition) return 'Do something'
  const values = definition.params.map((param) => valueLabel(param.field, action.config[param.key], context))
  return [definition.label, ...values].join(' ')
}

// Three lines for a rule card: when, if (none when there are no conditions), then.
export function describeRule(rule: AutomationDraft, context: AutomationContext = DEFAULT_AUTOMATION_CONTEXT): { when: string; conditions: string[]; then: string[] } {
  return {
    when: describeTrigger(rule.trigger_type, rule.trigger_config, context),
    conditions: rule.conditions.map((condition) => describeCondition(condition, context)),
    then: rule.actions.map((action) => describeAction(action, context)),
  }
}

// How many more automations the Space may have.
export function rulesLeft(rules: unknown[]): number {
  return Math.max(0, AUTOMATION_LIMITS.rulesPerSpace - rules.length)
}

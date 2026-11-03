import type { AutomationRule, AutomationRuleInput } from '@/data/automation'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

// The Space's automations. Any member can read them; admins and owners change
// them. A rule is switched on or off with `enabled` on an update.
export class AutomationRuleApi extends ApiResource<AutomationRule, AutomationRuleInput, Partial<AutomationRuleInput>> {
  constructor() {
    super('/api/v1/automation_rules', 'automation_rule', 'automation-rules')
  }
}

export const automationRuleApi = new AutomationRuleApi()

export const useAutomationRules = () => useResourceList(automationRuleApi)
export const useCreateAutomationRule = () => useResourceCreate(automationRuleApi)
export const useUpdateAutomationRule = () => useResourceUpdate(automationRuleApi)
export const useDeleteAutomationRule = () => useResourceDelete(automationRuleApi)

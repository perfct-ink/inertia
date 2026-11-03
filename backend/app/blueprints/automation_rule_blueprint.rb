class AutomationRuleBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :enabled, :trigger_type, :trigger_config, :conditions, :actions, :created_by_id, :created_at, :updated_at
end

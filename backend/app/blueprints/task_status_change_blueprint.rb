class TaskStatusChangeBlueprint < Blueprinter::Base
  identifier :id
  fields :from_status, :to_status, :created_at
  # An agent shows as itself ("Claude Code (agent)"), never as a person.
  field(:changed_by_name) { |change| change.agent_token ? "#{change.agent_token.name} (agent)" : change.changed_by&.name }
  field(:by_agent) { |change| change.agent_token_id.present? }
end

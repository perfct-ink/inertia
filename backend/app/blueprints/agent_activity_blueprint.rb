class AgentActivityBlueprint < Blueprinter::Base
  identifier :id
  fields :action, :summary, :subject_type, :subject_id, :agent_token_id, :created_at
  # The agent, never a person: "Claude Code (agent)".
  field(:agent_name) { |activity| "#{activity.agent_token.name} (agent)" }
end

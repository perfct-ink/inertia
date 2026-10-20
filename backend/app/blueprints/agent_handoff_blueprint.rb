class AgentHandoffBlueprint < Blueprinter::Base
  identifier :id
  fields :subject_type, :subject_id, :agent_name, :instruction, :prompt, :created_at
  field(:status) { |h| h.status }
  field(:sent_by_name) { |h| h.sent_by&.name }
end

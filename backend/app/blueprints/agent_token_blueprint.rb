class AgentTokenBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :permission, :token_prefix, :folder_id, :revoked_at, :last_used_at, :created_at
  field(:created_by_name) { |token| token.created_by&.name }
end

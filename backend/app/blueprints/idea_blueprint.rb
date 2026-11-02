class IdeaBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :promoted_type, :promoted_id, :submitted_by_id, :created_at, :updated_at
  field(:submitted_by_name) { |idea| idea.submitted_by&.name }
end

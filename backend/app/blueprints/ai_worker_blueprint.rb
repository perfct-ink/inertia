class AiWorkerBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :instructions, :model, :enabled, :created_at, :updated_at
end

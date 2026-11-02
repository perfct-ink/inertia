class TaskFieldBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :field_type, :options, :created_at, :updated_at
end

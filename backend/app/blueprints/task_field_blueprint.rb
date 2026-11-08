class TaskFieldBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :field_type, :options, :display_format, :created_at, :updated_at
end

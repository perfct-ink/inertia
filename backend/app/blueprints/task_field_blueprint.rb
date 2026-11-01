class TaskFieldBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :data_type, :created_at, :updated_at
end

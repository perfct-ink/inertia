class TaskDependencyBlueprint < Blueprinter::Base
  identifier :id
  fields :predecessor_id, :successor_id, :kind, :created_at
end

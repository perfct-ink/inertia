class TaskDependencyBlueprint < Blueprinter::Base
  identifier :id
  fields :predecessor_id, :successor_id, :kind, :created_at

  # Both ends, so a link to a task in another project can be named, dated and
  # placed without loading that project's tasks.
  association :predecessor, blueprint: TaskLinkBlueprint
  association :successor, blueprint: TaskLinkBlueprint
end

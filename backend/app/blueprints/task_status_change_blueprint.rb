class TaskStatusChangeBlueprint < Blueprinter::Base
  identifier :id
  fields :from_status, :to_status, :created_at
  field(:changed_by_name) { |change| change.changed_by&.name }

  # Many tasks' changes in one list (the agile reports): each tagged with its
  # task, without who made it, so no user is loaded per row.
  view :report do
    exclude :changed_by_name
    field :task_id
  end
end

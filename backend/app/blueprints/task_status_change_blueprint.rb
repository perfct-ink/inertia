class TaskStatusChangeBlueprint < Blueprinter::Base
  identifier :id
  fields :from_status, :to_status, :created_at
  field(:changed_by_name) { |change| change.changed_by&.name }
end

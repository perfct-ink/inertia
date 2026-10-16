class SprintBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :goal, :status, :owner_id, :created_at, :updated_at
  field :start_date
  field :end_date
  field :tasks_count
  field :done_tasks_count
end

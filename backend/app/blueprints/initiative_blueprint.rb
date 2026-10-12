class InitiativeBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :created_at, :updated_at
  field :start_date
  field :target_date
  field :tasks_count
  field :done_tasks_count
end

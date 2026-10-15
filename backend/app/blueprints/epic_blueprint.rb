class EpicBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :created_at, :updated_at
  field :folder_id
  field :initiative_id
  field :milestone_id
  field :start_date
  field :target_date
  field :tasks_count
  field :done_tasks_count
end

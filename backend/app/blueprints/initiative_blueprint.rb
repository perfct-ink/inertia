class InitiativeBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :created_at, :updated_at
  fields :description, :status, :owner_id, :milestone_id
  field :start_date
  field :target_date
  field :tasks_count
  field :done_tasks_count
  field :horizon
  field :health do |initiative|
    initiative.health(initiative.percent)
  end
end

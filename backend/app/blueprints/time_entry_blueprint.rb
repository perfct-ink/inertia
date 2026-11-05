class TimeEntryBlueprint < Blueprinter::Base
  identifier :id
  fields :task_id, :user_id, :started_at, :ended_at

  field :minutes
  field :user_name do |entry|
    entry.user.name
  end
end

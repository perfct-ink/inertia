class EventBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :date, :start_time, :end_time, :event_type, :created_at, :updated_at
  field :folder_id
  field :document_id

  view :with_tasks do
    association :tasks, blueprint: TaskBlueprint, view: :with_document
  end
end

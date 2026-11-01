class TaskBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :start_date, :due_date, :position, :created_at, :updated_at

  field :document_id
  field :assignee_id
  field :epic_id
  field :sprint_id
  field :milestone_id
  field :folder_id
  field :parent_id

  view :with_document do
    association :document, blueprint: DocumentBlueprint do |task, _options|
      task.document
    end
  end

  # { "<task field id>" => value } for the fields the task has a value for.
  # Only the tasks API renders these (it preloads :task_field_values), so tasks
  # embedded in folders and events don't query them one by one.
  view :with_custom_fields do
    field :custom_fields
  end

  view :with_document_and_custom_fields do
    include_view :with_document
    include_view :with_custom_fields
  end
end

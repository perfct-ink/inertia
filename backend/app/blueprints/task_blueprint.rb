class TaskBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :start_date, :due_date, :position, :created_at, :updated_at

  field :document_id
  field :assignee_id
  field :created_by_id
  field :created_by_name do |task|
    task.created_by&.name
  end
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
end

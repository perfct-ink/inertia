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
  field :ongoing
  field :check_in_every_days
  field(:check_in_due_at) { |task| task.check_in_due_at }
  field(:check_in_stale) { |task| task.check_in_stale? }

  view :with_document do
    association :document, blueprint: DocumentBlueprint do |task, _options|
      task.document
    end
  end
end

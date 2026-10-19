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
  field :priority
  field(:estimate_hours) { |task| task.estimate_hours&.to_f }
  field :story_points
  field :actual_story_points

  view :with_document do
    association :document, blueprint: DocumentBlueprint do |task, _options|
      task.document
    end
  end
end

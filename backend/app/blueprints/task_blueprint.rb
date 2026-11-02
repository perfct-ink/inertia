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

  # Values of the Space's custom task fields, keyed by the field's id. Fields
  # the task has no value for are left out. Preload `field_values` when
  # rendering a list.
  view :with_field_values do
    field :field_values do |task, _options|
      task.field_values.to_h { |field_value| [ field_value.task_field_id.to_s, field_value.value ] }
    end
  end

  view :with_document_and_field_values do
    include_view :with_document
    include_view :with_field_values
  end
end

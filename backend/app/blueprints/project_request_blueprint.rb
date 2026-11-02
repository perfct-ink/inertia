class ProjectRequestBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :description, :justification, :priority, :status, :decision_note, :decided_at,
         :project_id, :requested_by_id, :decided_by_id, :created_at, :updated_at
  field :start_date
  field :target_date

  field :requested_by_name do |project_request|
    project_request.requested_by&.name
  end
  field :decided_by_name do |project_request|
    project_request.decided_by&.name
  end
end

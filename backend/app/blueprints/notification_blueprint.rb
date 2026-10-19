class NotificationBlueprint < Blueprinter::Base
  identifier :id
  fields :kind, :title, :body, :subject_type, :subject_id, :workspace_id, :read_at, :created_at
end

class TaskStatusSettingBlueprint < Blueprinter::Base
  identifier :id
  fields :folder_id, :status, :label, :color
end

# A task as the other end of a dependency link: enough to name it, date it and
# place it in a project, without the rest of the task. The folder is the task's
# own or its document's (the same two routes ProjectScoped follows).
class TaskLinkBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :status, :start_date, :due_date

  field :folder_id do |task|
    task.folder_id || task.document&.folder_id
  end
end

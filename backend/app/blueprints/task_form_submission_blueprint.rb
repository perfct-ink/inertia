class TaskFormSubmissionBlueprint < Blueprinter::Base
  identifier :id
  fields :task_id, :answers, :created_at

  field :task_title do |submission|
    submission.task.title
  end
  field :task_status do |submission|
    submission.task.status
  end
  field :submitted_by_name do |submission|
    submission.submitted_by&.name
  end
end

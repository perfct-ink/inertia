class AiRunBlueprint < Blueprinter::Base
  identifier :id
  fields :ai_worker_id, :task_id, :status, :output, :error, :started_at, :finished_at, :created_at
end

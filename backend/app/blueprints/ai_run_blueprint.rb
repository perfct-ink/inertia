class AiRunBlueprint < Blueprinter::Base
  identifier :id
  fields :ai_worker_id, :task_id, :status, :output, :error, :input_tokens, :output_tokens, :started_at, :finished_at, :created_at
end

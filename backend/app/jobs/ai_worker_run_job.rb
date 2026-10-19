# Runs on the default in-process queue, like QuipImportJob.
class AiWorkerRunJob < ApplicationJob
  queue_as :default

  def perform(ai_run_id)
    run = AiRun.find_by(id: ai_run_id)
    AiWorkers::Runner.new(run).call if run&.queued?
  end
end

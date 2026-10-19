module AiWorkers
  # Runs one AiRun: marks it running, asks the client, stores the reply or the
  # error. Failures are recorded on the run (and logged), never raised, so a
  # bad call can't crash the job queue or leave a run stuck as "running".
  class Runner
    def initialize(run, client: AiWorkers.client)
      @run = run
      @client = client
    end

    def call
      @run.update!(status: :running, started_at: Time.current)
      worker = @run.ai_worker
      reply = Reply.coerce(@client.complete(
        model: worker.model,
        system: Prompt.system(worker),
        prompt: Prompt.task(@run.task)
      ))
      @run.update!(
        status: :succeeded, output: reply.text, finished_at: Time.current,
        input_tokens: reply.input_tokens, output_tokens: reply.output_tokens
      )
    rescue StandardError => e
      Rails.logger.error("AiRun #{@run.id} failed: #{e.class}: #{e.message}")
      @run.update!(status: :failed, error: e.message, finished_at: Time.current)
    end
  end
end

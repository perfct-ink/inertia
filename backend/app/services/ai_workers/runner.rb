module AiWorkers
  # Runs one AiRun: marks it running, asks the client, stores the reply (and the
  # tokens it cost, for per-Space usage) or the error. Failures are recorded on the run (and logged), never raised, so a
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
      @run.update!(status: :failed, error: e.message, finished_at: Time.current, **spent_by(e))
    end

    private

    # A refused or cut-off call may still have cost tokens; the Space is
    # charged for them even though the run failed.
    def spent_by(error)
      return {} unless error.is_a?(ProviderError)
      { input_tokens: error.input_tokens, output_tokens: error.output_tokens }
    end
  end
end

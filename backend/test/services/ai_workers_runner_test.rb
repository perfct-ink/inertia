require "test_helper"

class AiWorkersRunnerTest < ActiveSupport::TestCase
  class FakeClient
    attr_reader :calls

    def initialize(reply: "Here is a draft.", error: nil)
      @reply = reply
      @error = error
      @calls = []
    end

    def complete(**args)
      @calls << args
      raise @error if @error
      @reply
    end
  end

  # Replays one canned streamed reply in place of the HTTP layer.
  class CannedTransport
    def initialize(status, body)
      @status = status
      @body = body
    end

    def post(_url, headers:, body:)
      yield @status, @body
      @status
    end
  end

  STREAMED_REPLY = <<~SSE.freeze
    event: message_start
    data: {"type":"message_start","message":{"usage":{"input_tokens":21,"output_tokens":1}}}

    event: content_block_start
    data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

    event: content_block_delta
    data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"A short draft."}}

    event: message_delta
    data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}

    event: message_stop
    data: {"type":"message_stop"}

  SSE

  setup do
    user = User.create!(name: "Ada", email: "ada-runner@example.com", password: "password123")
    @task = user.workspace.tasks.create!(title: "Draft the launch post", description: "Two paragraphs.")
    worker = user.workspace.ai_workers.create!(name: "Writer", instructions: "Write in a friendly tone.", model: "claude-opus-5-5")
    @run = user.workspace.ai_runs.create!(ai_worker: worker, task: @task)
    @workspace = user.workspace
  end

  teardown do
    AiWorkers.client = nil
  end

  test "stores the reply and sends the worker's instructions and the task" do
    client = FakeClient.new
    AiWorkers::Runner.new(@run, client: client).call

    assert @run.reload.succeeded?
    assert_equal "Here is a draft.", @run.output
    assert @run.started_at && @run.finished_at

    call = client.calls.first
    assert_equal "claude-opus-5-5", call[:model]
    assert_includes call[:system], "Write in a friendly tone."
    assert_includes call[:prompt], "Draft the launch post"
    assert_includes call[:prompt], "Two paragraphs."
  end

  test "records a client error on the run instead of raising" do
    AiWorkers::Runner.new(@run, client: FakeClient.new(error: RuntimeError.new("rate limited"))).call

    assert @run.reload.failed?
    assert_equal "rate limited", @run.error
    assert @run.finished_at
  end

  test "fails with a clear message when no client is configured" do
    AiWorkers::Runner.new(@run, client: AiWorkers::UnconfiguredClient.new).call

    assert @run.reload.failed?
    assert_match(/No AI client is configured/, @run.error)
  end

  test "stores the tokens a reply reports, and the Space's usage adds them up" do
    reply = AiWorkers::Reply.new(text: "Done.", input_tokens: 120, output_tokens: 45)
    AiWorkers::Runner.new(@run, client: FakeClient.new(reply: reply)).call

    assert_equal [ "Done.", 120, 45 ], [ @run.reload.output, @run.input_tokens, @run.output_tokens ]
    assert_equal({ input_tokens: 120, output_tokens: 45 }, @workspace.ai_runs.token_usage)
    assert_equal({ input_tokens: 0, output_tokens: 0 }, AiRun.where(id: nil).token_usage)
  end

  test "a failed call still records the tokens it cost" do
    error = AiWorkers::ProviderError.new("The model declined this request (cyber).", input_tokens: 30, output_tokens: 2)
    AiWorkers::Runner.new(@run, client: FakeClient.new(error: error)).call

    assert @run.reload.failed?
    assert_equal "The model declined this request (cyber).", @run.error
    assert_equal [ 30, 2 ], [ @run.input_tokens, @run.output_tokens ]
  end

  test "a queued run ends succeeded with output and usage through the Anthropic client" do
    AiWorkers.client = AiWorkers::AnthropicClient.new(api_key: "test-key", transport: CannedTransport.new(200, STREAMED_REPLY))

    AiWorkerRunJob.perform_now(@run.id)

    assert @run.reload.succeeded?
    assert_equal "A short draft.", @run.output
    assert_equal [ 21, 9 ], [ @run.input_tokens, @run.output_tokens ]
  end

  test "an Anthropic API error ends the queued run failed with a readable message" do
    body = '{"type":"error","error":{"type":"rate_limit_error","message":"limit"}}'
    AiWorkers.client = AiWorkers::AnthropicClient.new(api_key: "test-key", transport: CannedTransport.new(429, body))

    AiWorkerRunJob.perform_now(@run.id)

    assert @run.reload.failed?
    assert_equal "Anthropic's rate limit was reached. Try again in a few minutes.", @run.error
    assert_nil @run.output
  end

  test "with no key configured the queued run fails with the unconfigured message" do
    AiWorkers.client = nil

    AiWorkerRunJob.perform_now(@run.id)

    assert @run.reload.failed?
    assert_match(/No AI client is configured/, @run.error)
  end

  test "the job skips a run that is no longer queued" do
    @run.update!(status: :succeeded, output: "done")
    AiWorkerRunJob.perform_now(@run.id)

    assert_equal "done", @run.reload.output
  end
end

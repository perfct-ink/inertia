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

  setup do
    user = User.create!(name: "Ada", email: "ada-runner@example.com", password: "password123")
    @task = user.workspace.tasks.create!(title: "Draft the launch post", description: "Two paragraphs.")
    worker = user.workspace.ai_workers.create!(name: "Writer", instructions: "Write in a friendly tone.", model: "claude-opus-5-5")
    @run = user.workspace.ai_runs.create!(ai_worker: worker, task: @task)
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

  test "the job skips a run that is no longer queued" do
    @run.update!(status: :succeeded, output: "done")
    AiWorkerRunJob.perform_now(@run.id)

    assert_equal "done", @run.reload.output
  end
end

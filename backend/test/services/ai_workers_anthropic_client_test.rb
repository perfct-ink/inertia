require "test_helper"

# Anthropic isn't loaded in these tests: a stub stands in for the SDK client.
class AiWorkersAnthropicClientTest < ActiveSupport::TestCase
  Block = Struct.new(:type, :text)
  Usage = Struct.new(:input_tokens, :output_tokens)
  Details = Struct.new(:category)
  Response = Struct.new(:content, :stop_reason, :usage, :stop_details, keyword_init: true)

  class StubSdk
    attr_reader :requests

    def initialize(response: nil, error: nil)
      @response = response
      @error = error
      @requests = []
    end

    def messages = self

    def create(**args)
      @requests << args
      raise @error if @error
      @response
    end
  end

  def client(sdk) = AiWorkers::AnthropicClient.new(api_key: "test-key", sdk: sdk)

  test "returns the text blocks with token counts and sends system and prompt" do
    sdk = StubSdk.new(response: Response.new(
      content: [ Block.new(:thinking, nil), Block.new(:text, "Hello "), Block.new(:text, "world") ],
      stop_reason: :end_turn, usage: Usage.new(12, 34)
    ))

    reply = client(sdk).complete(model: "claude-opus-5-5", system: "Be brief.", prompt: "Say hi")

    assert_equal "Hello world", reply.text
    assert_equal [ 12, 34 ], [ reply.input_tokens, reply.output_tokens ]
    request = sdk.requests.first
    assert_equal :"claude-opus-5-5", request[:model]
    assert_equal "Be brief.", request[:system_]
    assert_equal [ { role: "user", content: "Say hi" } ], request[:messages]
  end

  test "a refusal becomes a readable error" do
    sdk = StubSdk.new(response: Response.new(content: [], stop_reason: :refusal, stop_details: Details.new(:cyber)))

    error = assert_raises(AiWorkers::ProviderError) { client(sdk).complete(model: "m", system: "s", prompt: "p") }
    assert_equal "The model declined this request (cyber).", error.message
  end

  test "runner stores output and usage from a client reply, and records an error" do
    user = User.create!(name: "Ada", email: "ada-adapter@example.com", password: "password123")
    worker = user.workspace.ai_workers.create!(name: "Writer")
    task = user.workspace.tasks.create!(title: "Draft")
    run = user.workspace.ai_runs.create!(ai_worker: worker, task: task)
    sdk = StubSdk.new(response: Response.new(content: [ Block.new(:text, "Done.") ], stop_reason: :end_turn, usage: Usage.new(5, 7)))

    AiWorkers::Runner.new(run, client: client(sdk)).call

    assert run.reload.succeeded?
    assert_equal [ "Done.", 5, 7 ], [ run.output, run.input_tokens, run.output_tokens ]
    assert_equal 12, user.workspace.ai_tokens_used

    failing = user.workspace.ai_runs.create!(ai_worker: worker, task: user.workspace.tasks.create!(title: "Other"))
    refusal = StubSdk.new(response: Response.new(content: [], stop_reason: :refusal))
    AiWorkers::Runner.new(failing, client: client(refusal)).call
    assert failing.reload.failed?
    assert_match(/declined/, failing.error)
  end
end

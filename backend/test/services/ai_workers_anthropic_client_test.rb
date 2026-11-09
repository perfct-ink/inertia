require "test_helper"

# The Anthropic client is exercised through a stub transport, so these tests
# make no network calls and need no key.
class AiWorkersAnthropicClientTest < ActiveSupport::TestCase
  KEY = "sk-ant-test-key-1234".freeze

  # Stands in for AiWorkers::HttpTransport: replays a canned response in small
  # chunks (so events and multi-byte characters straddle chunk boundaries).
  class StubTransport
    attr_reader :requests

    def initialize(status: 200, body: "", chunk_size: 7, error: nil)
      @status = status
      @body = body.b
      @chunk_size = chunk_size
      @error = error
      @requests = []
    end

    def post(url, headers:, body:)
      @requests << { url: url, headers: headers, body: JSON.parse(body) }
      raise @error if @error
      @body.bytes.each_slice(@chunk_size) { |bytes| yield @status, bytes.pack("C*") }
      @status
    end
  end

  def sse(*events)
    events.map { |name, data| "event: #{name}\ndata: #{data.to_json}\n\n" }.join
  end

  def text_stream(*pieces, stop_reason: "end_turn", stop_details: nil, input: 25, output: 40)
    events = [
      [ "message_start", { type: "message_start", message: { id: "msg_1", usage: { input_tokens: input, output_tokens: 1 } } } ],
      [ "content_block_start", { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } } ],
      [ "content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "hmm" } } ],
      [ "content_block_stop", { type: "content_block_stop", index: 0 } ],
      [ "content_block_start", { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } } ],
      [ "ping", { type: "ping" } ]
    ]
    pieces.each { |text| events << [ "content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text } } ] }
    delta = { stop_reason: stop_reason }
    delta[:stop_details] = stop_details if stop_details
    events << [ "content_block_stop", { type: "content_block_stop", index: 1 } ]
    events << [ "message_delta", { type: "message_delta", delta: delta, usage: { output_tokens: output } } ]
    events << [ "message_stop", { type: "message_stop" } ]
    sse(*events)
  end

  def client(transport) = AiWorkers::AnthropicClient.new(api_key: KEY, transport: transport)

  def complete(transport, **options)
    client(transport).complete(model: "claude-opus-5-5", system: "Be brief.", prompt: "Say hi", **options)
  end

  test "streams the reply text with token counts and sends the key only as a header" do
    transport = StubTransport.new(body: text_stream("Hello ", "wörld ", "✓"))

    reply = complete(transport)

    assert_equal "Hello wörld ✓", reply.text
    assert_equal [ 25, 40 ], [ reply.input_tokens, reply.output_tokens ]

    request = transport.requests.first
    assert_equal "https://api.anthropic.com/v1/messages", request[:url]
    assert_equal KEY, request[:headers]["x-api-key"]
    assert_equal "2023-06-01", request[:headers]["anthropic-version"]
    body = request[:body]
    assert_equal "claude-opus-5-5", body["model"]
    assert_equal true, body["stream"]
    assert_equal "Be brief.", body["system"]
    assert_equal [ { "role" => "user", "content" => "Say hi" } ], body["messages"]
    assert_operator body["max_tokens"], :>, 0
    assert_not_includes request[:body].to_json, KEY
  end

  test "defaults the model and leaves out an empty system prompt" do
    transport = StubTransport.new(body: text_stream("ok"))

    client(transport).complete(model: "", system: "", prompt: "p")

    body = transport.requests.first[:body]
    assert_equal "claude-opus-5-5", body["model"]
    assert_not body.key?("system")
  end

  test "a rate limit becomes a readable error" do
    body = { type: "error", error: { type: "rate_limit_error", message: "Number of request tokens has exceeded your limit" } }.to_json

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 429, body: body)) }

    assert_equal "Anthropic's rate limit was reached. Try again in a few minutes.", error.message
  end

  test "API errors never echo the key and keep the useful detail" do
    unauthorized = { type: "error", error: { type: "authentication_error", message: "invalid x-api-key #{KEY}" } }.to_json
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 401, body: unauthorized)) }
    assert_match(/rejected the API key/, error.message)
    assert_not_includes error.message, KEY

    invalid = { type: "error", error: { type: "invalid_request_error", message: "max_tokens: must be greater than 0" } }.to_json
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 400, body: invalid)) }
    assert_equal "Anthropic rejected the request: max_tokens: must be greater than 0", error.message

    missing = { type: "error", error: { type: "not_found_error", message: "model: claude-nope" } }.to_json
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 404, body: missing)) }
    assert_match(/does not know that model.*claude-nope/, error.message)
  end

  test "a non-JSON error body falls back to the HTTP status" do
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 529, body: "<html>busy</html>")) }
    assert_match(/overloaded/, error.message)

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 502, body: "")) }
    assert_match(/internal error/, error.message)

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(status: 418, body: "null")) }
    assert_match(/returned an error \(418\)/, error.message)
  end

  test "an error event in the middle of the stream fails the run" do
    stream = sse(
      [ "message_start", { type: "message_start", message: { usage: { input_tokens: 3, output_tokens: 1 } } } ],
      [ "error", { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } ]
    )

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(body: stream)) }

    assert_match(/overloaded/, error.message)
  end

  test "a refusal is a readable error that still reports the tokens spent" do
    stream = text_stream(stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" }, input: 12, output: 3)

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(body: stream)) }

    assert_equal "The model declined this request (cyber).", error.message
    assert_equal [ 12, 3 ], [ error.input_tokens, error.output_tokens ]
  end

  test "timeouts and connection failures are readable" do
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(error: Net::ReadTimeout.new)) }
    assert_equal "Anthropic took too long to respond. Try again.", error.message

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(error: Net::OpenTimeout.new)) }
    assert_match(/took too long/, error.message)

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(error: Errno::ECONNREFUSED.new)) }
    assert_equal "Could not reach Anthropic (ECONNREFUSED). Try again.", error.message

    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(error: SocketError.new("getaddrinfo: Name or service not known"))) }
    assert_match(/Could not reach Anthropic/, error.message)
  end

  test "a stream that ends early or has no text fails instead of succeeding" do
    truncated = text_stream("Half a rep").sub(/event: message_stop.*\z/m, "")
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(body: truncated)) }
    assert_match(/cut off before it finished/, error.message)

    empty = text_stream("  ")
    error = assert_raises(AiWorkers::ProviderError) { complete(StubTransport.new(body: empty)) }
    assert_equal "The model returned no text.", error.message
    assert_equal 40, error.output_tokens
  end

  test "a reply that hit the length limit says so" do
    reply = complete(StubTransport.new(body: text_stream("A long draft", stop_reason: "max_tokens")))

    assert_match(/\AA long draft/, reply.text)
    assert_match(/cut off because it reached the model's length limit/, reply.text)
  end

  test "the key is required and stays out of inspect" do
    assert_raises(ArgumentError) { AiWorkers::AnthropicClient.new(api_key: " ") }
    assert_not_includes client(StubTransport.new).inspect, KEY
  end

  test "the SSE parser handles CRLF, comments and multi-line data across chunks" do
    events = []
    parser = AiWorkers::SseParser.new { |event, data| events << [ event, data ] }

    ": keep-alive\r\n\r\nevent: a\r\ndata: one\r\ndata: two\r\n\r\nevent: b\r\nda".each_char.each_slice(5) { |chars| parser << chars.join }
    parser << "ta: tail"
    parser.finish

    assert_equal [ [ "a", "one\ntwo" ], [ "b", "tail" ] ], events
  end
end

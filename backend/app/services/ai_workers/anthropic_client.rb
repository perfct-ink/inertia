require "json"
require "net/http"
require "openssl"

module AiWorkers
  # Calls Anthropic's Messages API over plain HTTPS and streams the reply
  # (server-sent events), so long outputs are not cut off by a request
  # timeout. The key is handed in by the initializer (config/initializers/
  # ai_workers.rb reads ANTHROPIC_API_KEY); it goes in a request header and
  # nowhere else: not in errors, logs, `inspect` or any API response.
  #
  # This stands in for the official `anthropic` gem, which needs a networked
  # `bundle add` and a decision from Alex (see the task file). The gem's
  # `client.messages.stream` would replace #complete's body and HttpTransport;
  # the `complete(model:, system:, prompt:)` interface and the Reply it returns
  # stay the same.
  #
  # Refusals, rate limits, timeouts and API errors all raise ProviderError with
  # a readable message, which Runner stores on the run as its error.
  class AnthropicClient
    API_URL = "https://api.anthropic.com/v1/messages".freeze
    API_VERSION = "2023-06-01".freeze
    DEFAULT_MODEL = "claude-opus-5-5".freeze
    # Ceiling for one reply, thinking included. The per-Space cap is the
    # separate limits task.
    MAX_TOKENS = 32_000

    # What a dropped or refused connection raises (a stall raises Timeout::Error).
    CONNECTION_ERRORS = [ SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError, Net::ProtocolError, Net::HTTPBadResponse ].freeze

    def initialize(api_key:, transport: HttpTransport.new)
      raise ArgumentError, "An Anthropic API key is required" if api_key.to_s.strip.empty?
      @api_key = api_key.to_s.strip
      @transport = transport
    end

    def complete(model:, system:, prompt:)
      stream = MessageStream.new
      parser = SseParser.new { |event, data| stream.consume(event, data) }
      error_body = String.new(encoding: Encoding::BINARY)

      status = @transport.post(API_URL, headers: headers, body: request_body(model, system, prompt)) do |code, chunk|
        code == 200 ? parser << chunk : error_body << chunk.to_s.b
      end
      raise api_error(status, error_body) unless status == 200

      parser.finish
      stream.reply
    rescue Timeout::Error
      raise ProviderError, "Anthropic took too long to respond. Try again."
    rescue *CONNECTION_ERRORS => e
      raise ProviderError, "Could not reach Anthropic (#{e.class.name.demodulize}). Try again."
    end

    # Keeps the key out of logs and error reports that print the object.
    def inspect
      "#<#{self.class.name} api_key=[FILTERED]>"
    end

    private

    def headers
      {
        "content-type" => "application/json",
        "accept" => "text/event-stream",
        # Anything but identity would have Net::HTTP buffer to inflate.
        "accept-encoding" => "identity",
        "anthropic-version" => API_VERSION,
        "x-api-key" => @api_key
      }
    end

    def request_body(model, system, prompt)
      body = {
        model: model.presence || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages: [ { role: "user", content: prompt } ]
      }
      body[:system] = system if system.present?
      JSON.generate(body)
    end

    # An HTTP error carries Anthropic's JSON ({"error": {"type", "message"}});
    # a proxy in between may send anything, so fall back to the status.
    def api_error(status, body)
      parsed = JSON.parse(body.dup.force_encoding(Encoding::UTF_8))
      error = parsed.is_a?(Hash) && parsed["error"].is_a?(Hash) ? parsed["error"] : {}
      ProviderError.from_api(type: error["type"], message: error["message"], status: status)
    rescue JSON::ParserError
      ProviderError.from_api(status: status)
    end
  end
end

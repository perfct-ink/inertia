module AiWorkers
  class ProviderError < StandardError; end

  # Calls Anthropic's Messages API through the official `anthropic` gem. The key
  # is read on the server from ANTHROPIC_API_KEY and never reaches the browser.
  # The gem is referenced only inside methods, so this file loads (and the app
  # boots) without it; `AiWorkers.client` is only set to this class when the gem
  # is present (see config/initializers/ai_workers.rb).
  #
  # Not streaming: the Ruby SDK's streaming binding isn't documented in the
  # references available when this was written, and a non-streaming request at
  # MAX_TOKENS stays inside the SDK's HTTP timeout. Move to streaming if replies
  # need to be longer.
  class AnthropicClient
    MAX_TOKENS = 16_000

    def initialize(api_key: ENV["ANTHROPIC_API_KEY"], sdk: nil)
      @api_key = api_key
      @sdk = sdk
    end

    def complete(model:, system:, prompt:)
      response = sdk.messages.create(
        model: model.to_sym,
        max_tokens: MAX_TOKENS,
        system_: system,
        messages: [ { role: "user", content: prompt } ]
      )
      raise ProviderError, refusal_message(response) if response.stop_reason == :refusal

      Reply.new(
        text: response.content.select { |block| block.type == :text }.map(&:text).join,
        input_tokens: response.usage&.input_tokens,
        output_tokens: response.usage&.output_tokens
      )
    rescue Anthropic::Errors::APIStatusError => e
      raise ProviderError, "Anthropic API error (#{e.type}): #{e.message}"
    end

    private

    def sdk
      @sdk ||= Anthropic::Client.new(api_key: @api_key)
    end

    def refusal_message(response)
      category = response.stop_details&.category
      "The model declined this request#{" (#{category})" if category}."
    end
  end
end

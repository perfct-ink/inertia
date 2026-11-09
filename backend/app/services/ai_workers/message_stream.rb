require "json"

module AiWorkers
  # Folds the events of a streamed Messages API reply into the final text,
  # the token counts and how it stopped. Only `text` content blocks count
  # toward the reply; thinking blocks are skipped.
  #
  # Event shapes: https://docs.anthropic.com/en/api/messages-streaming
  class MessageStream
    LENGTH_NOTICE = "\n\n[The reply was cut off because it reached the model's length limit.]".freeze

    attr_reader :stop_reason, :input_tokens, :output_tokens

    def initialize
      @blocks = {}
      @text_indexes = []
      @input_tokens = nil
      @output_tokens = nil
      @stop_reason = nil
      @refusal_category = nil
      @finished = false
    end

    # Takes one SSE event (name and its JSON data). Raises ProviderError for an
    # `error` event.
    def consume(name, data)
      return if data.blank?
      payload = JSON.parse(data)
      case payload["type"] || name
      when "message_start" then start(payload["message"] || {})
      when "content_block_start" then block_start(payload)
      when "content_block_delta" then block_delta(payload)
      when "message_delta" then message_delta(payload)
      when "message_stop" then @finished = true
      when "error"
        error = payload["error"] || {}
        raise ProviderError.from_api(type: error["type"], message: error["message"])
      end
    rescue JSON::ParserError
      raise ProviderError, "Anthropic sent a reply that could not be read."
    end

    def finished?
      @finished
    end

    # The reply, or a ProviderError when the model refused, stopped without
    # text, or the stream ended early.
    def reply
      raise ProviderError, "The reply from Anthropic was cut off before it finished." unless finished?
      raise refusal_error if stop_reason == "refusal"

      text = @text_indexes.map { |index| @blocks[index] }.join
      raise ProviderError.new("The model returned no text.", **usage) if text.strip.empty?

      text += LENGTH_NOTICE if stop_reason == "max_tokens"
      Reply.new(text: text, **usage)
    end

    private

    def usage
      { input_tokens: input_tokens, output_tokens: output_tokens }
    end

    def start(message)
      u = message["usage"] || {}
      # Cached input is still input the Space paid for.
      @input_tokens = [ u["input_tokens"], u["cache_creation_input_tokens"], u["cache_read_input_tokens"] ].compact.sum if u["input_tokens"]
      @output_tokens = u["output_tokens"] if u["output_tokens"]
    end

    def block_start(payload)
      block = payload["content_block"] || {}
      text_block(payload["index"]) << block["text"].to_s if block["type"] == "text"
    end

    def block_delta(payload)
      delta = payload["delta"] || {}
      return unless delta["type"] == "text_delta"
      text_block(payload["index"]) << delta["text"].to_s
    end

    def text_block(index)
      unless @blocks.key?(index)
        @text_indexes << index
        @blocks[index] = +""
      end
      @blocks[index]
    end

    def message_delta(payload)
      delta = payload["delta"] || {}
      @stop_reason = delta["stop_reason"] if delta["stop_reason"]
      @refusal_category = (delta["stop_details"] || {})["category"] if delta["stop_details"]
      # Counts in message_delta are cumulative for the whole reply.
      u = payload["usage"] || {}
      @output_tokens = u["output_tokens"] if u["output_tokens"]
      @input_tokens = u["input_tokens"] if u["input_tokens"] && @input_tokens.nil?
    end

    def refusal_error
      suffix = " (#{@refusal_category})" if @refusal_category.present?
      ProviderError.new("The model declined this request#{suffix}.", **usage)
    end
  end
end

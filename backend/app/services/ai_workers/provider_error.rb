module AiWorkers
  # A failure from the model provider, worded for the person looking at the
  # failed run. It is stored as the run's `error` text, so it never contains
  # the API key or the request body. A refusal can still have cost tokens, so
  # an error may carry the usage the call had reached.
  class ProviderError < StandardError
    # Anthropic's error types (the same strings come back in the body of an
    # HTTP error and in a mid-stream `error` event).
    MESSAGES = {
      "authentication_error" => "Anthropic rejected the API key. An admin needs to check ANTHROPIC_API_KEY.",
      "permission_error" => "The Anthropic API key is not allowed to use this model.",
      "billing_error" => "The Anthropic account has a billing problem.",
      "request_too_large" => "This task is too large to send to the model.",
      "rate_limit_error" => "Anthropic's rate limit was reached. Try again in a few minutes.",
      "overloaded_error" => "Anthropic is overloaded right now. Try again in a few minutes.",
      "api_error" => "Anthropic had an internal error. Try again in a few minutes."
    }.freeze

    # HTTP status to error type, for bodies that are not Anthropic's JSON
    # (a proxy's 502, say).
    STATUS_TYPES = {
      400 => "invalid_request_error",
      401 => "authentication_error",
      402 => "billing_error",
      403 => "permission_error",
      404 => "not_found_error",
      413 => "request_too_large",
      429 => "rate_limit_error",
      500 => "api_error",
      502 => "api_error",
      503 => "api_error",
      504 => "api_error",
      529 => "overloaded_error"
    }.freeze

    MAX_DETAIL = 300

    attr_reader :input_tokens, :output_tokens

    def initialize(message = nil, input_tokens: nil, output_tokens: nil)
      super(message)
      @input_tokens = input_tokens
      @output_tokens = output_tokens
    end

    # Builds the error for an API error type and message; `status` is used
    # when the body gave no type.
    def self.from_api(type: nil, message: nil, status: nil)
      type = STATUS_TYPES[status] if type.blank?
      detail = message.to_s.strip.truncate(MAX_DETAIL)
      text = MESSAGES[type]
      text ||= case type
      when "invalid_request_error" then "Anthropic rejected the request#{": #{detail}" if detail.present?}"
      when "not_found_error" then "Anthropic does not know that model or endpoint#{" (#{detail})" if detail.present?}."
      else "Anthropic returned an error (#{type.presence || status || "unknown"})#{": #{detail}" if detail.present?}"
      end
      new(text)
    end
  end
end

module AiWorkers
  # What a client hands back: the reply text plus token counts for usage
  # tracking. A client may return a bare String (tests and simple clients do);
  # `coerce` accepts both.
  Reply = Struct.new(:text, :input_tokens, :output_tokens, keyword_init: true) do
    def self.coerce(value)
      value.is_a?(self) ? value : new(text: value.to_s)
    end
  end
end

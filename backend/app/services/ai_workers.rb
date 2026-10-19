# The seam between Inertia and a language model. A client is any object with
# `complete(model:, system:, prompt:)` that returns the reply text. None is
# configured by default, so runs fail with a clear message instead of
# reaching out anywhere; set `AiWorkers.client` (an initializer) once the
# Anthropic adapter exists. See docs/services.md.
module AiWorkers
  class NotConfigured < StandardError; end

  class UnconfiguredClient
    def complete(**)
      raise NotConfigured, "No AI client is configured. Set AiWorkers.client (see docs/services.md)."
    end
  end

  class << self
    attr_writer :client

    def client
      @client ||= UnconfiguredClient.new
    end
  end
end

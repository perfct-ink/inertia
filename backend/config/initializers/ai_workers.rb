# Connects AI workers to Anthropic when ANTHROPIC_API_KEY is set. With no key
# AiWorkers.client stays the unconfigured client and runs fail with a clear
# message (docs/services.md). This is the only place the key is read; it goes
# straight into the client and is never put in config, a response or a log.
#
# to_prepare, not a bare assignment: AiWorkers is reloadable code in
# development, and Rails does not autoload it during initialization.
# Tests set AiWorkers.client themselves and must never reach the network.
unless Rails.env.test?
  Rails.application.config.to_prepare do
    api_key = ENV["ANTHROPIC_API_KEY"].to_s.strip
    AiWorkers.client = api_key.empty? ? nil : AiWorkers::AnthropicClient.new(api_key: api_key)
  end
end

# Connects AI workers to Anthropic when a key is configured. With no key, or
# without the `anthropic` gem installed, AiWorkers.client stays the unconfigured
# client and runs fail with a clear message (docs/services.md).
if ENV["ANTHROPIC_API_KEY"].present?
  if Gem.loaded_specs.key?("anthropic")
    require "anthropic"
    AiWorkers.client = AiWorkers::AnthropicClient.new
  else
    Rails.logger.warn("ANTHROPIC_API_KEY is set but the anthropic gem is not installed; AI workers stay disabled.")
  end
end

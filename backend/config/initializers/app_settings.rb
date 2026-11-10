# The one place environment variables are read (docs/rules/backend.md,
# Initializers). Controllers and services ask AppSettings, never ENV, so the
# variable names stay as documented in docs/services.md, docs/deployment.md and
# docker-compose.coolify.yml. The values are read when asked rather than copied
# at boot, so a test can set a variable for one case and restore it.
module AppSettings
  # The credentials each social sign-in provider needs: setting name => variable.
  SOCIAL_VARIABLES = {
    "google" => { client_id: "GOOGLE_CLIENT_ID", client_secret: "GOOGLE_CLIENT_SECRET" },
    "apple" => { client_id: "APPLE_CLIENT_ID", team_id: "APPLE_TEAM_ID", key_id: "APPLE_KEY_ID", private_key: "APPLE_PRIVATE_KEY" }
  }.freeze

  module_function

  # Development sign-in bypass (BYPASS_AUTH=true makes every request run as the
  # first user). It is ignored in production, whatever the variable says: only
  # convention used to keep it off there.
  def bypass_auth?
    !Rails.env.production? && ENV["BYPASS_AUTH"] == "true"
  end

  # Origin of the SPA, prefixed to the marketing pages' Login and Sign up links.
  def web_url
    ENV.fetch("WEB_URL", "")
  end

  # Origin of this API, for links to uploaded files in imports.
  def app_url
    ENV.fetch("APP_URL", "http://localhost:3847")
  end

  # The base of the sign-in callback URLs ("" when unset).
  def oauth_callback_base_url
    ENV.fetch("OAUTH_CALLBACK_BASE_URL", "")
  end

  # A provider's credentials by setting name (client_id, ...), nil for any not set.
  # Unknown providers have none.
  def social_credentials(provider)
    SOCIAL_VARIABLES.fetch(provider, {}).transform_values { |variable| ENV[variable].presence }
  end

  # The names of the variables a provider still needs, for the status page and messages.
  def missing_social_variables(provider)
    SOCIAL_VARIABLES.fetch(provider, {}).select { |setting, _| social_credentials(provider)[setting].nil? }.values
  end
end

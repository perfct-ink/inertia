# Authenticates a request by an agent token (`Authorization: Bearer inertia_agent_...`)
# instead of a signed-in person. Agents reach only the MCP and agent endpoints,
# never the rest of the API (the people's API accepts only user JWTs, which an
# agent token is not). The token is read from the header only, never from the URL
# or body, so it cannot end up in a request log. Include in controllers that
# inherit ActionController::API directly, not ApplicationController.
module AgentAuthenticated
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_agent!
  end

  private

  attr_reader :agent_token

  def authenticate_agent!
    response.set_header("Cache-Control", "no-store")
    plain = request.authorization.to_s[/\ABearer\s+(\S+)\z/, 1]
    @agent_token = AgentToken.authenticate(plain)
    return if @agent_token

    # The same answer for a missing, wrong, revoked or no-longer-usable token.
    response.set_header("WWW-Authenticate", 'Bearer realm="inertia"')
    render json: { error: "Missing, invalid or revoked agent token" }, status: :unauthorized
  end
end

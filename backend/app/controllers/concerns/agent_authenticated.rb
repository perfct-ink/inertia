# Authenticates a request by an agent token (Authorization: Bearer inertia_agent_...)
# instead of a signed-in person. Agents reach only the MCP and agent endpoints,
# never the rest of the API.
module AgentAuthenticated
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_agent!
  end

  private

  attr_reader :agent_token

  def authenticate_agent!
    plain = request.authorization.to_s[/\ABearer\s+(\S+)\z/, 1]
    @agent_token = AgentToken.authenticate(plain)
    return if @agent_token
    response.set_header("WWW-Authenticate", 'Bearer realm="inertia"')
    render json: { error: "Missing, invalid or revoked agent token" }, status: :unauthorized
  end
end

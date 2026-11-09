module Api
  module V1
    # The agent operations over plain REST, for agents that don't speak MCP. The
    # same tools and the same token rules as POST /mcp (AgentTools): GET lists the
    # tools the token may use, POST /agent/tools/:tool_name runs one with a JSON
    # object of arguments as the body. This is the part `public-api-and-webhooks`
    # can build on; it does not accept signed-in people's tokens.
    class AgentToolsController < ActionController::API
      include AgentAuthenticated

      def index
        render json: AgentTools.for_token(agent_token).map { |t| { name: t.name, description: t.description, write: t.write, input_schema: t.schema } }
      end

      def create
        arguments = request.raw_post.blank? ? {} : JSON.parse(request.raw_post)
        return render(json: { error: "The body must be a JSON object of arguments" }, status: :bad_request) unless arguments.is_a?(Hash)

        render json: { result: AgentTools.call(agent_token, params[:tool_name], arguments).as_json }
      rescue JSON::ParserError
        render json: { error: "The body is not valid JSON" }, status: :bad_request
      rescue AgentTools::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end

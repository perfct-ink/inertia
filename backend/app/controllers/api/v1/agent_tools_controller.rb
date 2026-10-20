module Api
  module V1
    # The agent operations over plain REST, for agents that don't speak MCP. Same
    # tools, same token rules: GET lists them, POST /agent/tools/:name runs one
    # with a JSON body of arguments.
    class AgentToolsController < ActionController::API
      include AgentAuthenticated

      def index
        render json: AgentTools.for_token(agent_token).map { |t| { name: t.name, description: t.description, input_schema: t.schema } }
      end

      def create
        arguments = request.request_parameters.except("name", "agent_tool")
        render json: { result: AgentTools.call(agent_token, params[:name], arguments) }
      rescue AgentTools::Error => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end

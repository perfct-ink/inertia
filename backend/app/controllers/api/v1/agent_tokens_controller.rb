module Api
  module V1
    # A Space owner or admin makes, lists and revokes the tokens agents use. The
    # token itself is returned once, when it is made.
    class AgentTokensController < ApplicationController
      include WorkspaceScoped
      before_action -> { require_manage_in!(current_workspace.id) }

      def index
        render json: AgentTokenBlueprint.render(current_workspace.agent_tokens.order(:created_at))
      end

      def create
        folder = current_workspace.folders.find(params[:folder_id]) if params[:folder_id].present?
        token, plain = AgentToken.issue!(
          workspace: current_workspace, name: params.require(:name), permission: params[:permission].presence || :read, folder: folder, created_by: current_user
        )
        render json: AgentTokenBlueprint.render_as_hash(token).merge(token: plain, mcp_url: "#{request.base_url}/mcp"), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      rescue ArgumentError => e
        render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end

      def destroy
        current_workspace.agent_tokens.find(params[:id]).revoke!
        head :no_content
      end
    end
  end
end

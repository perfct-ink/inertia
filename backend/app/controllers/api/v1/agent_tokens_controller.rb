module Api
  module V1
    # Space owners make, list and revoke the tokens outside agents use. The token
    # itself is returned once, when it is made; the list shows only a short prefix.
    #
    # Owners only: not admins, not members. A token gives an outside program
    # standing access to the Space's content, so it is the owner's call, like
    # granting the owner role (WorkspaceRoleGrants).
    class AgentTokensController < ApplicationController
      include WorkspaceScoped
      before_action :require_owner!

      def index
        render json: AgentTokenBlueprint.render(current_workspace.agent_tokens.includes(:created_by).order(:created_at))
      end

      def create
        folder = current_workspace.folders.find(params[:folder_id]) if params[:folder_id].present?
        token, plain = AgentToken.issue!(
          workspace: current_workspace, name: params[:name].to_s, permission: params[:permission].presence || :read,
          folder: folder, created_by: current_user
        )
        response.set_header("Cache-Control", "no-store")
        render json: AgentTokenBlueprint.render_as_hash(token).merge(token: plain, mcp_url: "#{request.base_url}/mcp"), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      # Revokes (the row stays, so the activity it logged still names the agent).
      def destroy
        current_workspace.agent_tokens.find(params[:id]).revoke!
        head :no_content
      end

      private

      def require_owner!
        raise Pundit::NotAuthorizedError unless membership_in(current_workspace.id).owner?
      end
    end
  end
end

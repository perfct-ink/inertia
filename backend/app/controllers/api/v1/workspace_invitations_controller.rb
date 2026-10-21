module Api
  module V1
    # Invitations to a Space for people without an account. Admins and owners
    # create, list and revoke them; the invited person accepts one with its
    # token (not scoped to a Space, since they aren't a member yet).
    class WorkspaceInvitationsController < ApplicationController
      include WorkspaceScoped
      include WorkspaceRoleGrants
      skip_before_action :require_current_workspace_write!
      before_action :set_workspace, except: :accept

      def index
        require_manage_in!(@workspace.id)
        render json: WorkspaceInvitationBlueprint.render(@workspace.invitations.pending.order(:created_at))
      end

      def create
        require_manage_in!(@workspace.id)
        role = params[:role].presence || "member"
        invitation = @workspace.invitations.build(email: params.require(:email).to_s, role: role, invited_by: current_user)
        authorize_role_grant!(invitation.role)
        if invitation.save
          render json: WorkspaceInvitationBlueprint.render(invitation), status: :created
        else
          render json: { errors: invitation.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        require_manage_in!(@workspace.id)
        invitation = @workspace.invitations.pending.find(params[:id])
        authorize_role_grant!(invitation.role)
        invitation.destroy
        head :no_content
      end

      # Joins the signed-in user to the invited Space. An unknown, used or
      # someone else's token is simply "not found".
      def accept
        invitation = WorkspaceInvitation.pending.find_by!(token: params[:token])
        invitation.accept!(current_user)
        membership = invitation.workspace.memberships.find_by!(user: current_user)
        render json: WorkspaceBlueprint.render(invitation.workspace, roles: { invitation.workspace_id => membership.role })
      end

      private

      def set_workspace
        @workspace = current_user.accessible_workspaces.find(params[:workspace_id])
      end
    end
  end
end

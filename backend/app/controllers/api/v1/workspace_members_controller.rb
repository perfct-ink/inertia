module Api
  module V1
    # Who belongs to a workspace and with which role. The workspace is named
    # in the path (not the X-Workspace-Id header) so a member list can be
    # managed from anywhere.
    class WorkspaceMembersController < ApplicationController
      include WorkspaceScoped
      include WorkspaceRoleGrants
      skip_before_action :require_current_workspace_write!
      before_action :set_workspace

      def index
        render json: WorkspaceMembershipBlueprint.render(@workspace.memberships.includes(:user).order(:created_at))
      end

      # Adds an existing user by email.
      def create
        require_manage_in!(@workspace.id)
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        return render json: { errors: [ "No user with that email" ] }, status: :unprocessable_entity unless user

        membership = @workspace.memberships.build(user: user, role: requested_role || :member)
        authorize_role_grant!(membership.role)
        if membership.save
          render json: WorkspaceMembershipBlueprint.render(membership), status: :created
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        require_manage_in!(@workspace.id)
        membership = @workspace.memberships.find(params[:id])
        role = requested_role
        return render json: { errors: [ "Role is invalid" ] }, status: :unprocessable_entity unless role

        authorize_role_grant!(role)
        authorize_role_grant!(membership.role) # changing an owner's role is an owner-only action too
        if membership.update(role: role)
          render json: WorkspaceMembershipBlueprint.render(membership)
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Admins remove members; anyone can remove themselves (leave).
      def destroy
        membership = @workspace.memberships.find(params[:id])
        unless membership.user_id == current_user.id
          require_manage_in!(@workspace.id)
          authorize_role_grant!(membership.role)
        end
        if membership.destroy
          head :no_content
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_workspace
        @workspace = current_user.accessible_workspaces.find(params[:workspace_id])
      end

      def requested_role
        role = params[:role].to_s
        role if WorkspaceMembership.roles.key?(role)
      end
    end
  end
end

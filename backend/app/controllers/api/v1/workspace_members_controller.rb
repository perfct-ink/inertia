module Api
  module V1
    # Who belongs to a workspace and with which role. The workspace is named
    # in the path (not the X-Workspace-Id header) so a member list can be
    # managed from anywhere.
    class WorkspaceMembersController < ApplicationController
      include WorkspaceScoped
      skip_before_action :require_current_workspace_write!
      before_action :set_workspace

      # The direct memberships, then the people who are on the workspace only
      # through a team (no id, with the teams that give them their role).
      def index
        direct = WorkspaceMembershipBlueprint.render_as_hash(@workspace.memberships.includes(:user).order(:created_at))
        render json: direct + TeamOnlyMemberBlueprint.render_as_hash(TeamOnlyMember.in(@workspace))
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

      # Changes a member's role, their weekly capacity in hours, or both.
      def update
        require_manage_in!(@workspace.id)
        membership = @workspace.memberships.find(params[:id])
        attributes = {}
        if params.key?(:role) || !params.key?(:weekly_capacity_hours)
          role = requested_role
          return render json: { errors: [ "Role is invalid" ] }, status: :unprocessable_entity unless role

          authorize_role_grant!(role)
          authorize_role_grant!(membership.role) # changing an owner's role is an owner-only action too
          attributes[:role] = role
        end
        attributes[:weekly_capacity_hours] = params[:weekly_capacity_hours] if params.key?(:weekly_capacity_hours)
        if membership.update(attributes)
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

      # Only an owner may grant, change or revoke the owner role.
      def authorize_role_grant!(role)
        raise Pundit::NotAuthorizedError if role.to_s == "owner" && !membership_in(@workspace.id).owner?
      end
    end
  end
end

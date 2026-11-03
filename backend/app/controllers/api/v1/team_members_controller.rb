module Api
  module V1
    # The people on a team. Admins and owners add an existing user by email
    # and remove people; both answer with the updated team. Anyone added gets
    # the team's role in the workspace straight away. Anyone can take
    # themselves off a team (leave), whatever their role.
    class TeamMembersController < ApplicationController
      include WorkspaceScoped
      skip_before_action :require_current_workspace_write!
      before_action :set_team
      before_action :require_manage, only: :create

      def create
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        return render json: { errors: [ "No user with that email" ] }, status: :unprocessable_entity unless user

        membership = @team.memberships.build(user: user)
        if membership.save
          render json: TeamBlueprint.render(@team.reload), status: :created
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Admins and owners remove people (answering with the updated team);
      # anyone can remove themselves. Leaving answers 204, like leaving a
      # space: the person may have just lost access to the team's workspace, so
      # no team details come back.
      def destroy
        membership = @team.memberships.find(params[:id])
        leaving = membership.user_id == current_user.id
        require_manage unless leaving
        membership.destroy
        if leaving
          head :no_content
        else
          render json: TeamBlueprint.render(@team.reload)
        end
      end

      private

      def set_team
        workspace = current_user.accessible_workspaces.find(params[:workspace_id])
        @team = workspace.teams.find(params[:team_id])
      end

      def require_manage
        require_manage_in!(@team.workspace_id)
      end
    end
  end
end

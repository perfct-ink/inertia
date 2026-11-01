module Api
  module V1
    # Teams in a workspace: named groups of people that hold one role there
    # together. Any member can read them; admins and owners create, change and
    # delete them. The workspace is named in the path (like members), not the
    # X-Workspace-Id header, so the list can be managed from anywhere.
    class TeamsController < ApplicationController
      include WorkspaceScoped
      skip_before_action :require_current_workspace_write!
      before_action :set_workspace
      before_action :require_manage, except: :index
      before_action :set_team, only: [ :update, :destroy ]

      def index
        render json: TeamBlueprint.render(teams.order(:name))
      end

      def create
        team = @workspace.teams.build(team_params)
        if team.save
          render json: TeamBlueprint.render(team), status: :created
        else
          render json: { errors: team.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @team.update(team_params)
          render json: TeamBlueprint.render(@team)
        else
          render json: { errors: @team.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @team.destroy
        head :no_content
      end

      private

      def set_workspace
        @workspace = current_user.accessible_workspaces.find(params[:workspace_id])
      end

      def require_manage
        require_manage_in!(@workspace.id)
      end

      def teams
        @workspace.teams.includes(memberships: :user)
      end

      def set_team
        @team = teams.find(params[:id])
      end

      def team_params
        params.require(:team).permit(:name, :role)
      end
    end
  end
end

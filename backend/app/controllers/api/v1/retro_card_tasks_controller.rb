module Api
  module V1
    # Turns an action item card into a backlog task in the current Space.
    class RetroCardTasksController < ApplicationController
      include WorkspaceScoped

      def create
        card = RetroCard.joins(:retrospective)
          .where(retrospectives: { workspace_id: current_workspace.id })
          .find(params[:retro_card_id])
        if card.create_task(current_workspace, current_user)
          render json: RetroCardBlueprint.render(card.reload, user_id: current_user.id), status: :created
        else
          render json: { errors: card.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end

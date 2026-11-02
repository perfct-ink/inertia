module Api
  module V1
    # Add (PUT-like, repeatable) or take back the caller's vote on a card.
    class RetroVotesController < ApplicationController
      include WorkspaceScoped
      before_action :set_card

      def create
        @card.votes.find_or_create_by!(user_id: current_user.id)
        render_card status: :created
      rescue ActiveRecord::RecordNotUnique
        # A double click or a second tab: the vote is already counted.
        render_card status: :created
      end

      def destroy
        @card.votes.where(user_id: current_user.id).destroy_all
        render_card
      end

      private

      def set_card
        @card = RetroCard.joins(:retrospective)
          .where(retrospectives: { workspace_id: current_workspace.id })
          .find(params[:retro_card_id])
      end

      # Reloaded so the vote count includes this request's change.
      def render_card(status: :ok)
        render json: RetroCardBlueprint.render(@card.reload, user_id: current_user.id), status: status
      end
    end
  end
end

module Api
  module V1
    class RetroCardsController < ApplicationController
      include WorkspaceScoped
      before_action :set_card, only: [ :update, :destroy ]

      def create
        retrospective = current_workspace.retrospectives.find(params.require(:retro_card)[:retrospective_id])
        card = retrospective.cards.build(card_params.merge(author: current_user))
        if card.save
          render json: card_json(card), status: :created
        else
          render json: { errors: card.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @card.update(card_params)
          render json: card_json(@card)
        else
          render json: { errors: @card.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @card.destroy
        head :no_content
      end

      private

      def set_card
        @card = RetroCard.joins(:retrospective)
          .where(retrospectives: { workspace_id: current_workspace.id })
          .find(params[:id])
      end

      def card_json(card)
        RetroCardBlueprint.render(card, user_id: current_user.id)
      end

      def card_params
        params.require(:retro_card).permit(:column_key, :body)
      end
    end
  end
end

module Api
  module V1
    class RetrospectivesController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_retrospective, only: [ :show, :update, :destroy ]

      def index
        retrospectives = in_current_project(current_workspace.retrospectives).includes(:cards).order(created_at: :desc, id: :desc)
        render json: RetrospectiveBlueprint.render(retrospectives)
      end

      # The board: the retrospective with all its cards.
      def show
        render json: board_json(@retrospective)
      end

      def create
        retrospective = file_in_current_project(current_workspace.retrospectives.build(create_params))
        retrospective.created_by = current_user
        if retrospective.save
          render json: RetrospectiveBlueprint.render(retrospective), status: :created
        else
          render json: { errors: retrospective.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @retrospective.update(update_params)
          render json: board_json(@retrospective)
        else
          render json: { errors: @retrospective.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @retrospective.destroy
        head :no_content
      end

      private

      def set_retrospective
        @retrospective = current_workspace.retrospectives.includes(cards: :votes).find(params[:id])
      end

      def board_json(retrospective)
        RetrospectiveBlueprint.render(retrospective, view: :with_cards, user_id: current_user.id)
      end

      # The template picks the board's columns, so it is only set at creation.
      def create_params
        params.require(:retrospective).permit(:title, :template, :sprint_id, :folder_id)
      end

      def update_params
        params.require(:retrospective).permit(:title, :sprint_id, :folder_id)
      end
    end
  end
end

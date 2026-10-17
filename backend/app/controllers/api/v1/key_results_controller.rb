module Api
  module V1
    class KeyResultsController < ApplicationController
      include WorkspaceScoped
      before_action :set_key_result, only: [ :update, :destroy ]

      def create
        objective = current_workspace.objectives.find(params.require(:key_result)[:objective_id])
        key_result = objective.key_results.build(key_result_params)
        if key_result.save
          render json: KeyResultBlueprint.render(key_result), status: :created
        else
          render json: { errors: key_result.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @key_result.update(key_result_params)
          render json: KeyResultBlueprint.render(@key_result)
        else
          render json: { errors: @key_result.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @key_result.destroy
        head :no_content
      end

      private

      def set_key_result
        @key_result = KeyResult.joins(:objective).where(objectives: { workspace_id: current_workspace.id }).find(params[:id])
      end

      def key_result_params
        params.require(:key_result).permit(:title, :initiative_id, :start_value, :target_value, :current_value, :unit, :position)
      end
    end
  end
end

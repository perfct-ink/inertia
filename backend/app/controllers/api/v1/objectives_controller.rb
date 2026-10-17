module Api
  module V1
    class ObjectivesController < ApplicationController
      include WorkspaceScoped
      before_action :set_objective, only: [ :update, :destroy ]

      def index
        objectives = current_workspace.objectives.includes(key_results: :initiative)
          .order(Arel.sql("target_date IS NULL"), :target_date, :title)
        render json: ObjectiveBlueprint.render(objectives)
      end

      def create
        objective = current_workspace.objectives.build(objective_params)
        if objective.save
          render json: ObjectiveBlueprint.render(objective), status: :created
        else
          render json: { errors: objective.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @objective.update(objective_params)
          render json: ObjectiveBlueprint.render(@objective)
        else
          render json: { errors: @objective.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @objective.destroy
        head :no_content
      end

      private

      def set_objective
        @objective = current_workspace.objectives.find(params[:id])
      end

      def objective_params
        params.require(:objective).permit(:title, :description, :status, :owner_id, :start_date, :target_date)
      end
    end
  end
end

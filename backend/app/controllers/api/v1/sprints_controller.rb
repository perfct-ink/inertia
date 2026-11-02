module Api
  module V1
    class SprintsController < ApplicationController
      include WorkspaceScoped
      before_action :set_sprint, only: [ :update, :destroy, :start, :close ]

      def index
        render json: SprintBlueprint.render(current_workspace.sprints.order(Arel.sql("start_date IS NULL"), :start_date, :title))
      end

      def create
        sprint = current_workspace.sprints.build(sprint_params)
        if sprint.save
          render json: SprintBlueprint.render(sprint), status: :created
        else
          render json: { errors: sprint.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @sprint.update(sprint_params)
          render json: SprintBlueprint.render(@sprint)
        else
          render json: { errors: @sprint.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def start
        @sprint.start!
        render json: SprintBlueprint.render(@sprint)
      end

      # POST /sprints/:id/close { carry_to_sprint_id: nil | id }
      def close
        carry_to = current_workspace.sprints.find(params[:carry_to_sprint_id]) if params[:carry_to_sprint_id].present?
        result = @sprint.close!(carry_to: carry_to)
        render json: { sprint: SprintBlueprint.render_as_hash(@sprint.reload), **result }
      end

      def destroy
        @sprint.destroy
        head :no_content
      end

      rescue_from Sprint::InvalidTransition do |error|
        render json: { errors: [ error.message ] }, status: :unprocessable_entity
      end

      private

      def set_sprint
        @sprint = current_workspace.sprints.find(params[:id])
      end

      def sprint_params
        params.require(:sprint).permit(:title, :goal, :start_date, :end_date, :status, :owner_id)
      end
    end
  end
end

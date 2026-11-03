module Api
  module V1
    class EpicsController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_epic, only: [ :update, :destroy ]

      def index
        epics = in_current_project(current_workspace.epics)
        epics = epics.where(folder_id: params[:folder_id]) if params[:folder_id]
        epics = epics.with_task_counts
        render json: EpicBlueprint.render(epics)
      end

      def create
        epic = file_in_current_project(current_workspace.epics.build(epic_params))
        if epic.save
          render json: EpicBlueprint.render(epic), status: :created
        else
          render json: { errors: epic.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @epic.update(epic_params)
          render json: EpicBlueprint.render(@epic)
        else
          render json: { errors: @epic.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @epic.destroy
        head :no_content
      end

      private

      def set_epic
        @epic = current_workspace.epics.find(params[:id])
      end

      def epic_params
        params.require(:epic).permit(:title, :folder_id, :initiative_id, :milestone_id, :start_date, :target_date, :horizon, :position)
      end
    end
  end
end

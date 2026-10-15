module Api
  module V1
    class EpicsController < ApplicationController
      include WorkspaceScoped
      before_action :set_epic, only: [ :update, :destroy ]

      def index
        # Grouped left join computes each epic's task counts in one query
        # instead of N+1'ing tasks.count/tasks.done.count per epic. The
        # CASE/SUM (not FILTER — that's Postgres-only) is MySQL-compatible.
        epics = current_workspace.epics
        epics = epics.where(folder_id: params[:folder_id]) if params[:folder_id]
        epics = epics
          .left_joins(:tasks)
          .group("epics.id")
          .select(
            "epics.*",
            "COUNT(tasks.id) AS tasks_count",
            ActiveRecord::Base.sanitize_sql_array(
              [ "SUM(CASE WHEN tasks.status = ? THEN 1 ELSE 0 END) AS done_tasks_count", Task.statuses[:done] ]
            )
          )
        render json: EpicBlueprint.render(epics)
      end

      def create
        epic = current_workspace.epics.build(epic_params)
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
        params.require(:epic).permit(:title, :folder_id, :initiative_id, :milestone_id, :start_date, :target_date)
      end
    end
  end
end

module Api
  module V1
    class MilestonesController < ApplicationController
      include WorkspaceScoped
      before_action :set_milestone, only: [ :update, :destroy ]

      # Each milestone with its rollup: progress and health computed from
      # everything beneath it (see MilestoneRollup).
      def index
        milestones = current_workspace.milestones.order(Arel.sql("target_date IS NULL"), :target_date, :title)
        render json: MilestoneBlueprint.render(milestones, rollups: MilestoneRollup.for(current_workspace))
      end

      def create
        milestone = current_workspace.milestones.build(milestone_params)
        if milestone.save
          render json: MilestoneBlueprint.render(milestone, rollups: rollups), status: :created
        else
          render json: { errors: milestone.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @milestone.update(milestone_params)
          render json: MilestoneBlueprint.render(@milestone, rollups: rollups)
        else
          render json: { errors: @milestone.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @milestone.destroy
        head :no_content
      end

      private

      def set_milestone
        @milestone = current_workspace.milestones.find(params[:id])
      end

      def rollups
        MilestoneRollup.for(current_workspace)
      end

      def milestone_params
        params.require(:milestone).permit(:title, :description, :target_date, :status, :owner_id, :folder_id)
      end
    end
  end
end

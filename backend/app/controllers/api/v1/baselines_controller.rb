module Api
  module V1
    class BaselinesController < ApplicationController
      include WorkspaceScoped

      def index
        folder = current_workspace.folders.find(params[:folder_id])
        render json: BaselineBlueprint.render(folder.baselines.includes(:baseline_tasks).order(:created_at))
      end

      def create
        folder = current_workspace.folders.find(params[:folder_id])
        baseline = Baseline.snapshot!(folder: folder, name: params.require(:baseline)[:name], created_by: current_user)
        render json: BaselineBlueprint.render(baseline), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      def destroy
        current_workspace.baselines.find(params[:id]).destroy
        head :no_content
      end
    end
  end
end

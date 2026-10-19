module Api
  module V1
    class AiWorkersController < ApplicationController
      include WorkspaceScoped
      before_action :set_worker, only: [ :update, :destroy ]

      def index
        render json: AiWorkerBlueprint.render(current_workspace.ai_workers.order(:name))
      end

      def create
        worker = current_workspace.ai_workers.build(worker_params)
        if worker.save
          render json: AiWorkerBlueprint.render(worker), status: :created
        else
          render json: { errors: worker.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @worker.update(worker_params)
          render json: AiWorkerBlueprint.render(@worker)
        else
          render json: { errors: @worker.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @worker.destroy
        head :no_content
      end

      private

      def set_worker
        @worker = current_workspace.ai_workers.find(params[:id])
      end

      def worker_params
        params.require(:ai_worker).permit(:name, :instructions, :model, :enabled)
      end
    end
  end
end

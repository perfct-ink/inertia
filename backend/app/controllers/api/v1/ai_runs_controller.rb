module Api
  module V1
    class AiRunsController < ApplicationController
      include WorkspaceScoped

      def index
        runs = current_workspace.ai_runs.order(created_at: :desc)
        runs = runs.where(task_id: params[:task_id]) if params[:task_id].present?
        render json: AiRunBlueprint.render(runs.limit(100))
      end

      # Queues a run: the worker's reply arrives later on the run record.
      def create
        run = current_workspace.ai_runs.build(
          ai_worker: current_workspace.ai_workers.find(params.require(:ai_run)[:ai_worker_id]),
          task: current_workspace.tasks.find(params.require(:ai_run)[:task_id])
        )
        if run.save
          AiWorkerRunJob.perform_later(run.id)
          render json: AiRunBlueprint.render(run), status: :created
        else
          render json: { errors: run.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end

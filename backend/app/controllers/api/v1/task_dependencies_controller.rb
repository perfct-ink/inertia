module Api
  module V1
    class TaskDependenciesController < ApplicationController
      include WorkspaceScoped

      def index
        render json: TaskDependencyBlueprint.render(current_workspace.task_dependencies.order(:id))
      end

      def create
        dependency = current_workspace.task_dependencies.build(
          predecessor: current_workspace.tasks.find(dependency_params[:predecessor_id]),
          successor: current_workspace.tasks.find(dependency_params[:successor_id]),
          kind: dependency_params[:kind].presence || "finish_to_start",
        )
        if dependency.save
          render json: TaskDependencyBlueprint.render(dependency), status: :created
        else
          render json: { errors: dependency.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        current_workspace.task_dependencies.find(params[:id]).destroy
        head :no_content
      end

      private

      def dependency_params
        params.require(:task_dependency).permit(:predecessor_id, :successor_id, :kind)
      end
    end
  end
end

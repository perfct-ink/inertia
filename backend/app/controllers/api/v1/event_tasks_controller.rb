module Api
  module V1
    class EventTasksController < ApplicationController
      include WorkspaceScoped
      before_action :set_event

      def create
        task = current_workspace.tasks.find(params[:task_id])
        @event.event_tasks.find_or_create_by!(task: task)
        render json: EventBlueprint.render(@event.reload.tap { |e| e.association(:tasks).reset }, view: :with_tasks)
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Task not found" }, status: :not_found
      end

      def destroy
        @event.event_tasks.where(task_id: params[:id]).destroy_all
        head :no_content
      end

      private

      def set_event
        @event = current_workspace.events.includes(tasks: :document).find(params[:event_id])
      end
    end
  end
end

module Api
  module V1
    # The status changes of many tasks at once, which the agile reports (burndown,
    # velocity, cumulative flow) are worked out from. It lists every change of the
    # Space's tasks, or of the open project's (X-Project-Id), or of one sprint's
    # (?sprint_id=), oldest first. A task's own history is
    # GET /api/v1/tasks/:id/status_changes.
    class TaskStatusChangesController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped

      def index
        tasks = current_workspace.tasks.reorder(nil)
        tasks = tasks.in_folders(project_folder_ids) if current_project
        tasks = tasks.where(sprint_id: params[:sprint_id]) if params[:sprint_id].present?
        changes = TaskStatusChange.where(task_id: tasks.select(:id)).order(:created_at, :id)
        render json: TaskStatusChangeBlueprint.render(changes, view: :report)
      end
    end
  end
end

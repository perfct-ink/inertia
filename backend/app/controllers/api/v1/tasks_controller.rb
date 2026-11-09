module Api
  module V1
    class TasksController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_task, only: [ :update, :destroy ]

      def index
        tasks = current_workspace.tasks.includes(:document, :participants, :time_entries, :field_values)
        tasks = tasks.where(document_id: params[:document_id]) if params[:document_id]
        tasks = tasks.where(status: params[:status]) if params[:status]
        tasks = tasks.where(kind: params[:kind]) if params[:kind].present? && Task.kinds.key?(params[:kind])
        if params[:assignee_id].present?
          tasks = tasks.where(id: TaskParticipant.where(role: :assignee, user_id: params[:assignee_id]).select(:task_id))
        end
        tasks = tasks.where(epic_id: params[:epic_id]) if params[:epic_id]
        tasks = tasks.where(sprint_id: params[:sprint_id]) if params[:sprint_id]
        if params[:folder_id]
          # A task can reach this folder directly, or through its document —
          # left join so direct-folder tasks (no document at all) aren't
          # excluded by an inner join against documents.
          tasks = tasks.left_joins(:document)
            .where("tasks.folder_id = :fid OR documents.folder_id = :fid", fid: params[:folder_id])
        end
        if current_project
          # Same two routes into the project, across its subfolders.
          tasks = tasks.left_joins(:document)
            .where("tasks.folder_id IN (:ids) OR documents.folder_id IN (:ids)", ids: project_folder_ids)
        end
        tasks = tasks.title_matching(params[:q]) if params[:q]
        render json: TaskBlueprint.render(tasks, view: :with_document_and_field_values, current_user: current_user)
      end

      def create
        task = current_workspace.tasks.build(task_params)
        task.status_changed_by = current_user
        task.actor = current_user
        task.document_id = params[:document_id] if params[:document_id].present?
        file_in_current_project(task) unless task.document_id
        if task.save
          render json: TaskBlueprint.render(task, current_user: current_user), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Moving a task's dates obeys the dependency mode of its folder (PM-14):
      # strict can answer 422, flexible also moves the tasks that wait on it and
      # lists them as `rescheduled`.
      def update
        @task.status_changed_by = current_user
        @task.actor = current_user
        scheduling = Scheduling::TaskUpdate.new(@task)
        if scheduling.call(task_params)
          render json: TaskBlueprint.render_as_hash(@task, current_user: current_user).merge(rescheduled: TaskBlueprint.render_as_hash(scheduling.rescheduled))
        else
          render json: { errors: scheduling.errors }, status: :unprocessable_entity
        end
      end

      # The task's status changes, oldest first.
      def status_changes
        render json: TaskStatusChangeBlueprint.render(current_workspace.tasks.find(params[:id]).status_changes.includes(:changed_by, :agent_token))
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      def set_task
        @task = current_workspace.tasks.find(params[:id])
      end

      def task_params
        params.require(:task).permit(:title, :description, :status, :kind, :start_date, :due_date, :position, :assignee_id, :epic_id, :sprint_id, :milestone_id, :folder_id, :parent_id, :priority, :estimate_hours, :story_points, :actual_story_points, :recurrence, :recurrence_from, assignee_ids: [], watcher_ids: [])
      end
    end
  end
end

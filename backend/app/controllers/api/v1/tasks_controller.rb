module Api
  module V1
    class TasksController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_task, only: [ :update, :destroy ]

      def index
        tasks = current_workspace.tasks.includes(:document, :field_values)
        tasks = tasks.where(document_id: params[:document_id]) if params[:document_id]
        tasks = tasks.where(status: params[:status]) if params[:status]
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
        render json: TaskBlueprint.render(tasks, view: :with_document_and_field_values)
      end

      def create
        task = current_workspace.tasks.build(task_params)
        task.document_id = params[:document_id] if params[:document_id].present?
        file_in_current_project(task) unless task.document_id
        if task.save
          render json: TaskBlueprint.render(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Moving a task's dates obeys the dependency mode of its folder (PM-14):
      # strict can answer 422, flexible also moves the tasks that wait on it and
      # lists them as `rescheduled`. A change of status then runs the Space's
      # automations (see Automations::Runner) before the task is returned, so
      # the answer shows what they did, and `automations` names the rules that ran.
      def update
        scheduling = Scheduling::TaskUpdate.new(@task)
        if scheduling.call(task_params)
          automations = run_automations
          render json: TaskBlueprint.render_as_hash(@task).merge(rescheduled: TaskBlueprint.render_as_hash(scheduling.rescheduled), automations: automations)
        else
          render json: { errors: scheduling.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      # The rules that ran because this edit changed the task's status.
      def run_automations
        from, = @task.saved_change_to_status
        return [] unless from

        Automations::Runner.new(current_workspace).task_status_changed(@task, from: from).applied
      end

      def set_task
        @task = current_workspace.tasks.find(params[:id])
      end

      def task_params
        params.require(:task).permit(:title, :description, :status, :start_date, :due_date, :position, :assignee_id, :epic_id, :sprint_id, :milestone_id, :folder_id, :parent_id, :priority, :estimate_hours, :story_points, :actual_story_points)
      end
    end
  end
end

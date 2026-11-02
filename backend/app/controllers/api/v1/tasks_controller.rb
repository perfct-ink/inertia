module Api
  module V1
    class TasksController < ApplicationController
      include WorkspaceScoped
      include FolderCollaboration
      before_action :set_task, only: [ :update, :destroy ]

      def index
        # The tasks of a document in a folder shared with the user live in that
        # document's Space, not the active one.
        shared_document = shared_document_for(params[:document_id])
        tasks = (shared_document ? Task.where(document_id: shared_document.id) : current_workspace.tasks).includes(:document, :field_values)
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
        tasks = tasks.title_matching(params[:q]) if params[:q]
        render json: TaskBlueprint.render(tasks, view: :with_document_and_field_values)
      end

      def create
        target = shared_creation_target
        return create_shared_task(target) if target

        # A task made in a document belongs to the document's Space, and the
        # document must be one the user can reach (anything else is not found).
        document = find_accessible_document(params[:document_id]) if params[:document_id].present?
        workspace = document ? document.folder.workspace : current_workspace
        require_write_in!(workspace.id)
        require_folder_in_space!(workspace)
        task = workspace.tasks.build(task_params)
        task.document = document if document
        if task.save
          render json: TaskBlueprint.render(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Moving a task's dates obeys the dependency mode of its folder (PM-14):
      # strict can answer 422, flexible also moves the tasks that wait on it and
      # lists them as `rescheduled`.
      def update
        return reject_shared_reschedule if @shared_task && dates_changed_with_links?

        require_folder_in_space!(@task.workspace)
        scheduling = Scheduling::TaskUpdate.new(@task)
        if scheduling.call(task_params)
          render json: TaskBlueprint.render_as_hash(@task).merge(rescheduled: TaskBlueprint.render_as_hash(scheduling.rescheduled))
        else
          render json: { errors: scheduling.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      def set_task
        @task = current_workspace.tasks.find_by(id: params[:id]) || find_shared_task
      end

      # A task's folder must be one of its own Space's; anything else is not found.
      def require_folder_in_space!(workspace)
        id = task_params[:folder_id]
        workspace.folders.find(id) if id.present?
      end

      def shared_document_for(id)
        return if id.blank?
        Document.where(folder_id: shared_folder_ids).includes(:folder).find_by(id: id)
      end

      # Where a new task goes when it is created inside a document or folder
      # shared with the user: that item's own Space. Nil for anything else.
      def shared_creation_target
        if params[:document_id].present?
          document = shared_document_for(params[:document_id])
          document && { folder: document.folder, document: document }
        elsif params.dig(:task, :folder_id).present?
          folder = Folder.where(id: shared_folder_ids).find_by(id: params.dig(:task, :folder_id))
          folder && { folder: folder, document: nil }
        end
      end

      def create_shared_task(target)
        require_folder_write!(target[:folder])
        task = target[:folder].workspace.tasks.build(shared_task_params)
        if target[:document]
          task.document = target[:document]
        else
          task.folder = target[:folder]
        end
        if task.save
          render json: TaskBlueprint.render(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # A task in a folder shared with the user, if they may change it: every
      # folder it sits in (directly or through its document) must be one they edit.
      def find_shared_task
        task = shared_tasks.find(params[:id])
        [ task.folder, task.document&.folder ].compact.each { |folder| require_folder_write!(folder) }
        @shared_task = true
        task
      end

      # Moving dates can drag other tasks along through dependency links, maybe
      # out of the shared folder, so that stays with Space members.
      def dates_changed_with_links?
        attrs = params.require(:task)
        return false unless attrs.key?(:start_date) || attrs.key?(:due_date)
        TaskDependency.where(predecessor_id: @task.id).or(TaskDependency.where(successor_id: @task.id)).exists?
      end

      def reject_shared_reschedule
        render json: { errors: [ "This task has dependencies, so only a Space member can change its dates" ] }, status: :unprocessable_entity
      end

      # Someone invited to a folder edits the task itself, not how it links into the Space.
      def shared_task_params
        params.require(:task).permit(*SHARED_TASK_ATTRIBUTES)
      end

      def task_params
        return shared_task_params if @shared_task

        params.require(:task).permit(:title, :description, :status, :start_date, :due_date, :position, :assignee_id, :epic_id, :sprint_id, :milestone_id, :folder_id, :parent_id, :priority, :estimate_hours, :story_points, :actual_story_points)
      end
    end
  end
end

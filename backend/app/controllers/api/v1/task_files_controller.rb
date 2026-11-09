module Api
  module V1
    # The uploaded files attached to a task. Any member who can write may attach
    # or detach; the task and the file both have to be in the current Space.
    # Detaching only removes the link: the file stays an item in its folder.
    class TaskFilesController < ApplicationController
      include WorkspaceScoped
      before_action :set_task

      # POST /api/v1/tasks/:task_id/files  { file_id }
      def create
        file = current_workspace.documents.where(doc_type: :file).find(params.require(:file_id))
        link = @task.task_files.build(file: file)
        if link.save
          render_task status: :created
        else
          render json: { errors: link.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/tasks/:task_id/files/:id  (the file's id)
      def destroy
        @task.task_files.find_by!(file_id: params[:id]).destroy!
        render_task
      end

      private

      def set_task
        @task = current_workspace.tasks.find(params[:task_id])
      end

      def render_task(status: :ok)
        render json: TaskBlueprint.render(@task.reload, view: :with_files), status: status
      end
    end
  end
end

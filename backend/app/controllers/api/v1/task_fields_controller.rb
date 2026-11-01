module Api
  module V1
    # The custom fields a Space defines for its tasks. Everyone in the Space
    # can read them; adding, renaming and deleting them (which changes every
    # task, and deleting drops the values) is for Space admins and owners.
    class TaskFieldsController < ApplicationController
      include WorkspaceScoped
      before_action :require_manage_fields!, unless: :read_request?
      before_action :set_task_field, only: [ :update, :destroy ]

      def index
        render json: TaskFieldBlueprint.render(current_workspace.task_fields)
      end

      def create
        field = current_workspace.task_fields.build(task_field_params)
        if field.save
          render json: TaskFieldBlueprint.render(field), status: :created
        else
          render json: { errors: field.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @task_field.update(task_field_params)
          render json: TaskFieldBlueprint.render(@task_field)
        else
          render json: { errors: @task_field.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @task_field.destroy
        head :no_content
      end

      private

      def require_manage_fields!
        require_manage_in!(current_workspace.id)
      end

      def set_task_field
        @task_field = current_workspace.task_fields.find(params[:id])
      end

      def task_field_params
        params.require(:task_field).permit(:name, :data_type)
      end
    end
  end
end

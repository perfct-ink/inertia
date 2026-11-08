module Api
  module V1
    # The Space's custom task fields (text, number, date, person, tags, dropdown,
    # checkbox, rating, vote).
    # Any member who can write may define them; viewers only read.
    class TaskFieldsController < ApplicationController
      include WorkspaceScoped
      before_action :set_task_field, only: [ :update, :destroy ]

      def index
        render json: TaskFieldBlueprint.render(current_workspace.task_fields.ordered)
      end

      def create
        task_field = current_workspace.task_fields.build(create_params)
        if task_field.save
          render json: TaskFieldBlueprint.render(task_field), status: :created
        else
          render json: { errors: task_field.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Only the name, the dropdown's choices and the display format change; the
      # kind is fixed.
      def update
        if @task_field.update(update_params)
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

      def set_task_field
        @task_field = current_workspace.task_fields.find(params[:id])
      end

      def create_params
        params.require(:task_field).permit(:name, :field_type, :display_format, options: [])
      end

      def update_params
        params.require(:task_field).permit(:name, :display_format, options: [])
      end
    end
  end
end

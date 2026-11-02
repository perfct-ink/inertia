module Api
  module V1
    # A task's values for the Space's custom fields. Any member who can write
    # may set them; the task and the field both have to be in the current Space.
    class TaskFieldValuesController < ApplicationController
      include WorkspaceScoped
      before_action :set_task_and_field

      # PUT /api/v1/tasks/:task_id/field_values/:task_field_id  { value }
      # An empty value (null, [], false, "") clears it. Votes go through #vote
      # so nobody can cast or take back another member's vote.
      def update
        return render_error("Cast votes with the vote endpoint.") if @task_field.vote?
        save_value(params.fetch(:value, nil))
      end

      # PUT /api/v1/tasks/:task_id/field_values/:task_field_id/vote  { voted }
      # Casts or takes back the signed-in user's own vote.
      def vote
        return render_error("#{@task_field.name} is not a vote field.") unless @task_field.vote?
        voters = @task.field_values.find_by(task_field: @task_field)&.value || []
        voted = ActiveModel::Type::Boolean.new.cast(params[:voted])
        save_value(voted ? voters | [ current_user.id ] : voters - [ current_user.id ])
      end

      private

      def set_task_and_field
        @task = current_workspace.tasks.find(params[:task_id])
        @task_field = current_workspace.task_fields.find(params[:task_field_id])
      end

      def save_value(raw)
        record = TaskFieldValue.write(@task, @task_field, raw)
        if record.errors.any?
          render_error(record.errors.full_messages)
        else
          render json: TaskBlueprint.render(@task.reload, view: :with_field_values)
        end
      end

      def render_error(messages)
        render json: { errors: Array(messages) }, status: :unprocessable_entity
      end
    end
  end
end

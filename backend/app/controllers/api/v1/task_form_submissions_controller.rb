module Api
  module V1
    # Responses to one form: list who filled it in (newest first) and fill it
    # in as a signed-in member. Viewers can read the list but not fill in the
    # form, like every other write in a Space.
    class TaskFormSubmissionsController < ApplicationController
      include WorkspaceScoped
      include TaskFormSubmitting
      before_action :set_form

      MAX_LISTED = 50

      def index
        submissions = @form.submissions.includes(:task, :submitted_by).order(created_at: :desc, id: :desc).limit(MAX_LISTED)
        render json: TaskFormSubmissionBlueprint.render(submissions)
      end

      def create
        outcome = @form.submit(answers_param, user: current_user)
        if outcome.ok?
          render json: TaskFormSubmissionBlueprint.render(outcome.submission), status: :created
        else
          render json: { errors: outcome.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_form
        @form = current_workspace.task_forms.find(params[:task_form_id])
      end
    end
  end
end

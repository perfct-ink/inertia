module Api
  module V1
    # Public forms: the one place someone with no account (only the link)
    # can create a task. A form answers here only when it is open, its public
    # link is on, and the server allows public forms (PUBLIC_FORMS_ENABLED);
    # anything else is a plain 404 so a link never says what it used to be.
    # Abuse limits: an unguessable token, a per-form hourly cap, a honeypot
    # field and the schema's answer length limits. There is no per-IP limit
    # (no rate-limiting gem is installed); see docs/features/task_forms.md.
    class PublicFormsController < ApplicationController
      include TaskFormSubmitting
      skip_before_action :authenticate_user!
      before_action :set_form

      def show
        render json: PublicTaskFormBlueprint.render(@form)
      end

      def create
        return render json: { error: "Too many responses just now. Please try again later." }, status: :too_many_requests if @form.public_throttled?
        # A bot filled in the field people can't see: say thanks, make nothing.
        return render json: { submitted: true }, status: :created if params[:website].present?

        outcome = @form.submit(answers_param)
        if outcome.ok?
          render json: { submitted: true }, status: :created
        else
          render json: { errors: outcome.errors }, status: :unprocessable_entity
        end
      end

      private

      def set_form
        form = TaskForm.find_by(token: params[:token].to_s)
        raise ActiveRecord::RecordNotFound unless form&.public_and_open?
        @form = form
      end
    end
  end
end

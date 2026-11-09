module Api
  module V1
    # Public forms: the one place someone with no account (only the link)
    # can create a task. A form answers here only when it is open, its public
    # link is on, and the server allows public forms (PUBLIC_FORMS_ENABLED);
    # anything else is a plain 404 so a link never says what it used to be.
    #
    # Abuse limits, all applied before a task is made: an unguessable token,
    # at most PER_IP_LIMIT responses an hour from one address, at most
    # TaskForm::PUBLIC_HOURLY_LIMIT an hour for the whole form, a honeypot
    # field and the schema's answer length limits. There is no CAPTCHA.
    class PublicFormsController < ApplicationController
      include TaskFormSubmitting
      skip_before_action :authenticate_user!

      PER_IP_LIMIT = 10
      TOO_MANY = "Too many responses just now. Please try again later.".freeze
      # Counted inside this server process (each process keeps its own count),
      # which is why the form-wide cap in TaskForm#public_throttled?, counted
      # in the database, stays as well. A constant so tests can reset it.
      RATE_LIMIT_STORE = ActiveSupport::Cache::MemoryStore.new(size: 1.megabyte)

      # Ahead of the lookup, so guesses at tokens count against the address too.
      rate_limit to: PER_IP_LIMIT, within: 1.hour, only: :create, store: RATE_LIMIT_STORE,
        with: -> { render json: { error: TOO_MANY }, status: :too_many_requests }
      before_action :set_form

      def show
        render json: PublicTaskFormBlueprint.render(@form)
      end

      def create
        return render json: { error: TOO_MANY }, status: :too_many_requests if @form.public_throttled?
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

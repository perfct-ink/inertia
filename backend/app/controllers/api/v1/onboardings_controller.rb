module Api
  module V1
    # The signed-in person's getting-started checklist progress. It belongs to
    # the person, not a Space, so it follows them across Spaces and devices.
    class OnboardingsController < ApplicationController
      def show
        render json: { onboarding: current_user.onboarding }
      end

      # PUT { onboarding: { dismissed: bool, done: [step ids] } }
      def update
        value = params.require(:onboarding).permit(:dismissed, done: [])
        current_user.onboarding = { "dismissed" => ActiveModel::Type::Boolean.new.cast(value[:dismissed]) || false, "done" => Array(value[:done]) }
        if current_user.save
          render json: { onboarding: current_user.onboarding }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end

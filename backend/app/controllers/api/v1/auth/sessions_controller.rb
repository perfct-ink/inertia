module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        respond_to :json
        before_action :normalize_development_login, only: :create

        private

        # A local shortcut to the seeded test workspace. Keep normal Devise
        # authentication and JWT issuance, and never enable it in production.
        def normalize_development_login
          return unless Rails.env.development?
          credentials = request.params["user"]
          return unless credentials.is_a?(Hash)
          return unless credentials["email"].to_s.strip.downcase == "admin" && credentials["password"] == "admin"

          credentials["email"] = "test@example.com"
          credentials["password"] = "password123"
        end

        def respond_with(resource, _opts = {})
          render json: {
            user: UserBlueprint.render_as_hash(resource),
            message: "Logged in successfully"
          }, status: :ok
        end

        def respond_to_on_destroy(_resource = nil)
          render json: { message: "Logged out successfully" }, status: :ok
        end
      end
    end
  end
end

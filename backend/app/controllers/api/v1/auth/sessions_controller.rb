module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        respond_to :json

        private

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

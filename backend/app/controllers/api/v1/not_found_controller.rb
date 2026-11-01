module Api
  module V1
    # Answers every /api path that no route matched. Without it an unknown API
    # path gets Rails' routing error page (empty or HTML unless the client asks
    # for JSON); the SPA's catch-all lives in nginx and never sees /api.
    class NotFoundController < ApplicationController
      skip_before_action :authenticate_user!

      def show
        not_found
      end
    end
  end
end

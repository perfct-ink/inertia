module Api
  module V1
    # "Shared with me": the folders other people invited the signed-in user to,
    # in Spaces the user is not a member of, each with its tree and the role held.
    class SharedFoldersController < ApplicationController
      def index
        render json: FolderMembershipBlueprint.render(FolderMembership.top_level_for(current_user), view: :shared)
      end
    end
  end
end

module Api
  module V1
    # An item's activity log, newest first:
    #   GET /api/v1/activities?subject_type=Task&subject_id=12
    # Any member of the item's Space (viewers too) can read it; nothing writes it
    # over the API. The item is looked up by id across the Spaces the person
    # belongs to (like documents), so its log follows it if it moves to another
    # Space, and an item in a Space they are not in is "not found".
    class ActivitiesController < ApplicationController
      include WorkspaceScoped

      def index
        # Only the listed model names are ever turned into a class.
        type = Activity::SUBJECT_TYPES.find { |name| name == params[:subject_type] }
        raise ActiveRecord::RecordNotFound unless type

        subject = type.constantize.find(params[:subject_id])
        raise ActiveRecord::RecordNotFound unless accessible_workspace_ids.include?(subject.workspace_id)

        render json: ActivityBlueprint.render(subject.activities.includes(:actor).newest_first.limit(Activity::PAGE_SIZE))
      end
    end
  end
end

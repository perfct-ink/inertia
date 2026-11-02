module Api
  module V1
    # An item's activity log, newest first:
    #   GET /api/v1/activities?subject_type=Task&subject_id=12
    # Any member of the space (viewers too) can read it; nothing writes it over the API.
    class ActivitiesController < ApplicationController
      include WorkspaceScoped

      def index
        raise ActiveRecord::RecordNotFound unless Activity::SUBJECT_TYPES.include?(params[:subject_type])

        activities = current_workspace.activities
          .where(subject_type: params[:subject_type], subject_id: params[:subject_id])
          .includes(:actor)
          .newest_first
          .limit(Activity::PAGE_SIZE)
        render json: ActivityBlueprint.render(activities)
      end
    end
  end
end

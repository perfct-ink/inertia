module Api
  module V1
    # What agents changed in the current Space, newest 100. Any member can read it
    # (like a task's status history); it names agents and what they did, never a
    # token. Optional filters: subject_type (Document, Task or Document for a
    # Collection), subject_id and agent_token_id.
    class AgentActivitiesController < ApplicationController
      include WorkspaceScoped

      SUBJECT_TYPES = %w[Document Task].freeze

      def index
        activities = current_workspace.agent_activities.includes(:agent_token).recent.limit(100)
        activities = activities.where(subject_type: params[:subject_type]) if SUBJECT_TYPES.include?(params[:subject_type])
        activities = activities.where(subject_id: params[:subject_id]) if params[:subject_id].present?
        activities = activities.where(agent_token_id: params[:agent_token_id]) if params[:agent_token_id].present?
        render json: AgentActivityBlueprint.render(activities)
      end
    end
  end
end

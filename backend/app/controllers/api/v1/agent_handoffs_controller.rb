module Api
  module V1
    # "Send to agent": hand a document, folder or task to an outside agent. The
    # response carries the prompt, the MCP URL and the token (shown once).
    class AgentHandoffsController < ApplicationController
      include WorkspaceScoped
      before_action :require_current_workspace_write!

      # Handoffs on one item, newest first.
      def index
        subject = find_subject(params[:subject_type], params[:subject_id])
        render json: AgentHandoffBlueprint.render(current_workspace.agent_handoffs.where(subject: subject).includes(:agent_token, :sent_by).order(created_at: :desc))
      end

      def create
        subject = find_subject(params[:subject_type], params[:subject_id])
        permission = params[:permission].presence || :write
        handoff, plain = AgentHandoff.hand_off!(subject: subject, sent_by: current_user, agent_name: params[:agent_name].presence || "Claude Code",
                                           instruction: params[:instruction], permission: permission, mcp_url: "#{request.base_url}/mcp")
        render json: AgentHandoffBlueprint.render_as_hash(handoff).merge(token: plain, mcp_url: "#{request.base_url}/mcp"), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      rescue ArgumentError => e
        render json: { errors: [ e.message ] }, status: :unprocessable_entity
      end

      private

      def find_subject(type, id)
        kind = AgentHandoff::SUBJECTS.key?(type.to_s) ? type.to_s : raise(ArgumentError, "subject_type must be document, folder or task")
        current_workspace.public_send(kind.pluralize).find(id)
      end
    end
  end
end

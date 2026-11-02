module Api
  module V1
    # Project intake. Every member of the Space can read the requests; members
    # and above submit them; the submitter can change or withdraw a request
    # while it is pending; admins and owners decide and can delete any.
    class ProjectRequestsController < ApplicationController
      include WorkspaceScoped
      before_action :set_project_request, only: [ :update, :destroy, :approve, :decline, :reopen ]
      before_action :require_manager!, only: [ :approve, :decline, :reopen ]
      before_action :require_submitter_or_manager!, only: [ :update, :destroy ]

      def index
        requests = current_workspace.project_requests.includes(:requested_by, :decided_by).order(created_at: :desc, id: :desc)
        render json: ProjectRequestBlueprint.render(requests)
      end

      def create
        project_request = current_workspace.project_requests.build(project_request_params.merge(requested_by: current_user))
        if project_request.save
          render json: ProjectRequestBlueprint.render(project_request), status: :created
        else
          render_errors(project_request.errors.full_messages)
        end
      end

      def update
        return render_errors("Only a pending request can be changed") unless @project_request.pending?

        if @project_request.update(project_request_params)
          render json: ProjectRequestBlueprint.render(@project_request)
        else
          render_errors(@project_request.errors.full_messages)
        end
      end

      def destroy
        @project_request.destroy
        head :no_content
      end

      # POST /project_requests/:id/approve { decision_note? } creates the project.
      def approve
        decide { @project_request.approve!(by: current_user, note: params[:decision_note].to_s) }
      end

      # POST /project_requests/:id/decline { decision_note } (the reason is required).
      def decline
        decide { @project_request.decline!(by: current_user, note: params[:decision_note].to_s) }
      end

      def reopen
        decide { @project_request.reopen! }
      end

      private

      def decide
        yield
        render json: ProjectRequestBlueprint.render(@project_request.reload)
      rescue ActiveRecord::RecordInvalid => e
        render_errors(e.record.errors.full_messages)
      end

      def render_errors(messages)
        render json: { errors: Array(messages) }, status: :unprocessable_entity
      end

      def set_project_request
        @project_request = current_workspace.project_requests.find(params[:id])
      end

      def require_manager!
        require_manage_in!(current_workspace.id)
      end

      # Admins and owners always; the submitter only while it is pending.
      def require_submitter_or_manager!
        return if membership_in(current_workspace.id).can_manage?
        raise Pundit::NotAuthorizedError unless @project_request.requested_by_id == current_user.id && @project_request.pending?
      end

      def project_request_params
        params.require(:project_request).permit(:name, :description, :justification, :priority, :start_date, :target_date)
      end
    end
  end
end

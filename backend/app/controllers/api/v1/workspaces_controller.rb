module Api
  module V1
    class WorkspacesController < ApplicationController
      include WorkspaceScoped
      # index/create/destroy are not about the header-selected workspace.
      skip_before_action :require_current_workspace_write!, only: [ :create, :destroy ]

      # Every workspace the user belongs to, with their role in each.
      def index
        workspaces = current_user.accessible_workspaces.order(personal: :desc, name: :asc)
        render json: WorkspaceBlueprint.render(workspaces, roles: roles)
      end

      # The workspace named by X-Workspace-Id (default: the personal one).
      def show
        workspace = current_workspace
        workspace.folders.includes(children: { children: :documents }, documents: []).load

        # Precomputed once here rather than per-folder in the blueprint —
        # avoids N+1 queries walking a tree of arbitrary depth. A folder
        # "has tasks" if a task points at it directly (folder_id) or at one
        # of its own documents (document_id); "has events" only via
        # folder_id, since Event has no document association.
        #
        # .reorder(nil): Task's default_scope orders by :position, which
        # MySQL's strict mode rejects combined with .distinct ("Expression
        # #1 of ORDER BY clause is not in SELECT list") since :position
        # isn't one of the plucked columns.
        render json: WorkspaceBlueprint.render(
          workspace,
          view: :with_folders,
          roles: roles,
          task_folder_ids: workspace.tasks.reorder(nil).where.not(folder_id: nil).distinct.pluck(:folder_id).to_set,
          task_document_ids: workspace.tasks.reorder(nil).where.not(document_id: nil).distinct.pluck(:document_id).to_set,
          event_folder_ids: workspace.events.where.not(folder_id: nil).distinct.pluck(:folder_id).to_set
        )
      end

      def create
        workspace = Workspace.new(workspace_params.merge(user: current_user, personal: false))
        if workspace.save
          render json: WorkspaceBlueprint.render(workspace, roles: roles), status: :created
        else
          render json: { errors: workspace.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        require_manage_in!(current_workspace.id)
        if current_workspace.update(workspace_params)
          render json: WorkspaceBlueprint.render(current_workspace, roles: roles)
        else
          render json: { errors: current_workspace.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        workspace = current_user.accessible_workspaces.find(params[:id])
        raise Pundit::NotAuthorizedError unless membership_in(workspace.id).owner?
        if workspace.destroy
          head :no_content
        else
          render json: { errors: workspace.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def roles
        current_user.workspace_memberships.to_h { |m| [ m.workspace_id, m.role ] }
      end

      def workspace_params
        params.require(:workspace).permit(:name, features: [])
      end
    end
  end
end

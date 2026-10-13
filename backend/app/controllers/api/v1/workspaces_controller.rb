module Api
  module V1
    class WorkspacesController < ApplicationController
      def show
        workspace = current_user.workspace
        workspace.ensure_document_root!
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
          root_folder_id: workspace.root_folder_id,
          task_folder_ids: workspace.tasks.reorder(nil).where.not(folder_id: nil).distinct.pluck(:folder_id).to_set,
          task_document_ids: workspace.tasks.reorder(nil).where.not(document_id: nil).distinct.pluck(:document_id).to_set,
          event_folder_ids: workspace.events.where.not(folder_id: nil).distinct.pluck(:folder_id).to_set
        )
      end

      def update
        if current_user.workspace.update(workspace_params)
          render json: WorkspaceBlueprint.render(current_user.workspace)
        else
          render json: { errors: current_user.workspace.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def workspace_params
        params.require(:workspace).permit(:name)
      end
    end
  end
end

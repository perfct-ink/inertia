module Api
  module V1
    # Resolves a hierarchical URL path to the folder or document it names. The
    # address does not name a Space, so the Space in X-Workspace-Id is tried
    # first and then the other Spaces the signed-in user can open (by
    # membership or a team), in id order; never a Space they cannot open. Any
    # role, viewers included, may look paths up; it only reads. An address the
    # item used to have still resolves, with `moved: true` so the web app
    # redirects to the new path.
    #
    # Whether the path names nothing or names something in a Space the user
    # cannot open, the answer is the same 404, so nothing is revealed about
    # Spaces they are not in.
    #
    #   GET /api/v1/paths?path=acme/product/requirements
    #   => { type: "document", id: 42, path: "/acme/product/requirements", moved: false,
    #        workspace: { id: 7, name: "Acme", personal: false, role: "member", ... } }
    class PathsController < ApplicationController
      include WorkspaceScoped

      def show
        segments = Slug.split(params[:path])
        match = PathResolver.find_across(current_user.accessible_workspaces.to_a, segments, preferred: current_workspace)
        raise ActiveRecord::RecordNotFound unless match

        item = match.item
        current = item.path_segments
        render json: {
          type: item.is_a?(Folder) ? "folder" : "document",
          id: item.id,
          path: Slug.path(current),
          moved: current != segments,
          workspace: WorkspaceBlueprint.render_as_hash(match.workspace, roles: workspace_access.transform_values(&:role))
        }
      end
    end
  end
end

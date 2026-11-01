module Api
  module V1
    # Resolves a hierarchical URL path to the folder or document it names, in
    # the Space selected by X-Workspace-Id. Any member (viewers included) may
    # look paths up; it only reads. An address the item used to have still
    # resolves, with `moved: true` so the web app redirects to the new path.
    #
    #   GET /api/v1/paths?path=acme/product/requirements
    #   => { type: "document", id: 42, path: "/acme/product/requirements", moved: false }
    class PathsController < ApplicationController
      include WorkspaceScoped

      def show
        segments = Slug.split(params[:path])
        item = PathResolver.find(current_workspace, segments)
        raise ActiveRecord::RecordNotFound unless item

        current = item.path_segments
        render json: {
          type: item.is_a?(Folder) ? "folder" : "document",
          id: item.id,
          path: Slug.path(current),
          moved: current != segments
        }
      end
    end
  end
end

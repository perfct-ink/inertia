module Api
  module V1
    # GET /api/v1/documents/link_targets?ids=12,14: which of these documents
    # exist and what headings they have, for marking broken links in a document
    # in one request (docs/features/heading_links.md). Documents are looked up
    # across every Space the user belongs to, like GET /api/v1/documents/:id.
    class DocumentLinkTargetsController < ApplicationController
      include WorkspaceScoped

      def index
        render json: DocumentLinkTargets.new(accessible_workspace_ids).lookup(params[:ids])
      end
    end
  end
end

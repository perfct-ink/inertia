module Api
  module V1
    # The custom paragraph styles one document's paragraphs refer to, whoever made
    # them, so a collaborator's browser can draw them. A person who can open the
    # document may read the name and formatting of the styles it uses, and of no
    # others: a style is otherwise private to the person who made it (see
    # ParagraphStylesController). The ids come from the document's saved content,
    # which the collaboration server writes a few seconds behind the editor.
    class DocumentParagraphStylesController < ApplicationController
      include WorkspaceScoped

      def index
        document = Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }).find(params[:document_id])
        styles = ParagraphStyle.where(id: ParagraphStyle.referenced_ids(document.content)).order(:id)
        render json: ParagraphStyleBlueprint.render(styles)
      end
    end
  end
end

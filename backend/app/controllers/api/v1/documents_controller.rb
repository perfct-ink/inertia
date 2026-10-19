module Api
  module V1
    class DocumentsController < ApplicationController
      include WorkspaceScoped
      # Documents are looked up by id across every workspace the user belongs to
      # (the collab server calls this without a workspace header), so the role is
      # checked against the document's own workspace instead.
      skip_before_action :require_current_workspace_write!
      before_action :set_folder, only: [ :index, :create ]
      before_action :set_document, only: [ :show, :update, :destroy, :backlinks ]

      def index
        documents = @folder.documents.order(:title)
        render json: DocumentBlueprint.render(documents)
      end

      def show
        render json: DocumentBlueprint.render(@document, view: :with_content)
      end

      # The documents that link to this one (readable only if the caller can
      # read this document; linking documents are in the same Space).
      def backlinks
        render json: DocumentBlueprint.render(@document.linking_documents.order(:title))
      end

      def create
        document = @folder.documents.build(document_params.merge(created_by: current_user))
        if document.save
          render json: DocumentBlueprint.render(document, view: :with_content), status: :created
        else
          render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @document.update(document_params)
          render json: DocumentBlueprint.render(@document, view: :with_content)
        else
          render json: { errors: @document.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        if @document.destroy
          head :no_content
        else
          render json: { errors: @document.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_folder
        @folder = Folder.where(workspace_id: accessible_workspace_ids).find(params[:folder_id])
        require_write_in!(@folder.workspace_id) unless read_request?
      end

      def set_document
        @document = Document.joins(:folder)
          .where(folders: { workspace_id: accessible_workspace_ids })
          .find(params[:id])
        require_write_in!(@document.folder.workspace_id) unless read_request?
      end

      def document_workspace_id
        @document ? @document.folder.workspace_id : @folder.workspace_id
      end

      def document_params
        permitted = params.require(:document).permit(:title, :doc_type, :pinned, :folder_id, content: {})
        # A document stays in its own workspace; moving it into another folder
        # of that workspace is the only move allowed.
        Folder.where(workspace_id: document_workspace_id).find(permitted[:folder_id]) if permitted[:folder_id]
        permitted.delete(:doc_type) if @document
        permitted
      end
    end
  end
end

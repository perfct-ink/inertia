module Api
  module V1
    class DocumentsController < ApplicationController
      include WorkspaceScoped
      include SpaceTransferable
      # Documents are looked up by id across every workspace the user belongs to
      # (the collab server calls this without a workspace header), so the role is
      # checked against the document's own workspace instead.
      skip_before_action :require_current_workspace_write!
      before_action :set_folder, only: [ :index, :create ]
      before_action :set_document, only: [ :show, :update, :destroy, :copy, :move, :backlinks ]

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
        render json: DocumentBlueprint.render(@document.backlinks)
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

      # Duplicates the document into a folder of any Space the user can write
      # in; the original stays where it is.
      def copy
        with_space_transfer do |transfer|
          render json: transferred(transfer.copy_document(@document)), status: :created
        end
      end

      # Moves the document, with its tasks, into a folder of another Space.
      def move
        with_space_transfer do |transfer|
          render json: transferred(transfer.move_document(@document))
        end
      end

      private

      def transferred(document)
        { workspace_id: document.folder.workspace_id, document: DocumentBlueprint.render_as_hash(document) }
      end

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
        permitted = params.require(:document).permit(:title, :doc_type, :pinned, :folder_id, :parent_feature_id, :feature_status, :feature_owner_id, :epic_id, :milestone_id, :initiative_id, content: {})
        # A document stays in its own workspace; moving it into another folder
        # of that workspace is the only move allowed.
        Folder.where(workspace_id: document_workspace_id).find(permitted[:folder_id]) if permitted[:folder_id]
        permitted.delete(:doc_type) if @document
        permitted
      end
    end
  end
end

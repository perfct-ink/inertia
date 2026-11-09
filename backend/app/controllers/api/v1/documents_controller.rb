module Api
  module V1
    class DocumentsController < ApplicationController
      include WorkspaceScoped
      include SpaceTransferable
      include FolderCollaboration
      # Documents are looked up by id across every workspace the user belongs to
      # (the collab server calls this without a workspace header), so the role is
      # checked against the document's own workspace instead. Documents in a
      # folder shared with the user (a Space they are not in) are reachable the
      # same way, with the role of their invitation.
      skip_before_action :require_current_workspace_write!
      before_action :set_folder, only: [ :index, :create ]
      before_action :set_document, only: [ :show, :update, :destroy, :copy, :move ]

      # Copying and moving between Spaces is for Space members only; an
      # invitation to a folder never lets content leave its Space.
      MEMBER_ONLY_ACTIONS = %w[copy move].freeze

      def index
        documents = @folder.documents.order(:title)
        render json: DocumentBlueprint.render(documents)
      end

      def show
        render_document(@document)
      end

      def create
        document = @folder.documents.build(document_params.merge(created_by: current_user))
        if document.save
          render_document(document, status: :created)
        else
          render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @document.update(document_params)
          render_document(@document)
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

      # `can_edit` tells the editor (and the collab server) whether to open the
      # document read-only.
      def render_document(document, status: :ok)
        render json: DocumentBlueprint.render(document, view: :with_access, can_edit: can_write_folder?(document.folder)), status: status
      end

      def set_folder
        @folder = find_accessible_folder(params[:folder_id])
        require_folder_write!(@folder) unless read_request?
      end

      def set_document
        @document = if MEMBER_ONLY_ACTIONS.include?(action_name)
          Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }).find(params[:id])
        else
          find_accessible_document(params[:id])
        end
        require_folder_write!(@document.folder) unless read_request?
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
        # Someone invited to a folder edits what is in it, but cannot pin it
        # for the whole Space or move it elsewhere in the Space.
        permitted = permitted.slice(:title, :doc_type, :content) unless space_member_of?(document_workspace_id)
        permitted
      end
    end
  end
end

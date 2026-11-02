module Api
  module V1
    # POST /api/v1/folders/:folder_id/files: upload a file of any type into a
    # folder as an item of its own (a document with doc_type "file").
    class FilesController < ApplicationController
      include WorkspaceScoped
      # Replacing starts from a document id (any of the user's Spaces); the role is checked against its own Space.
      skip_before_action :require_current_workspace_write!, only: :update

      # PUT /api/v1/documents/:document_id/file: replace a file item's contents
      # with a new upload (the name stays; it can be renamed separately).
      def update
        document = Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }, doc_type: :file).find(params[:document_id])
        require_write_in!(document.folder.workspace_id)
        upload = params[:file]
        return render(json: { errors: [ "No file provided" ] }, status: :unprocessable_entity) unless upload.respond_to?(:original_filename)

        document.file.attach(io: upload.tempfile, filename: upload.original_filename, content_type: upload.content_type)
        if document.save
          render json: DocumentBlueprint.render(document.reload)
        else
          render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def create
        folder = current_workspace.folders.find(params[:folder_id])
        upload = params[:file]
        return render(json: { errors: [ "No file provided" ] }, status: :unprocessable_entity) unless upload.respond_to?(:original_filename)

        document = folder.documents.build(title: upload.original_filename, doc_type: :file, created_by: current_user)
        document.file.attach(io: upload.tempfile, filename: upload.original_filename, content_type: upload.content_type)
        if document.save
          render json: DocumentBlueprint.render(document), status: :created
        else
          render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end

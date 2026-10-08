module Api
  module V1
    class DocumentsController < ApplicationController
      before_action :set_folder, only: [ :index, :create ]
      before_action :set_document, only: [ :show, :update, :destroy ]

      def index
        documents = @folder.documents.order(:title)
        render json: DocumentBlueprint.render(documents)
      end

      def show
        render json: DocumentBlueprint.render(@document, view: :with_content)
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
        @folder = current_user.workspace.folders.find(params[:folder_id])
      end

      def set_document
        @document = Document.joins(:folder)
          .where(folders: { workspace_id: current_user.workspace.id })
          .find(params[:id])
      end

      def document_params
        permitted = params.require(:document).permit(:title, :doc_type, :pinned, :folder_id, content: {})
        current_user.workspace.folders.find(permitted[:folder_id]) if permitted[:folder_id]
        permitted.delete(:doc_type) if @document
        permitted
      end
    end
  end
end

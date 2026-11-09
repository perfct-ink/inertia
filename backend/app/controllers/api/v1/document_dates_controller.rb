module Api
  module V1
    # Dates picked or typed in documents (date chips); the calendar lists them.
    # See docs/features/document_dates.md.
    class DocumentDatesController < ApplicationController
      include WorkspaceScoped
      include ProjectScoped
      before_action :set_document_date, only: [ :show, :update, :destroy ]

      # The calendar's list is narrowed to the selected project. The dates of one
      # document are not: the document asks for its own, whatever project is selected.
      def index
        dates = current_workspace.document_dates.includes(:document).in_order
        dates = params[:document_id] ? dates.where(document_id: params[:document_id]) : in_current_project(dates)
        render json: DocumentDateBlueprint.render(dates)
      end

      # One date, whatever project is selected: a chip in a document loads its date this way.
      def show
        render json: DocumentDateBlueprint.render(@document_date)
      end

      def create
        document_date = current_workspace.document_dates.build(create_params)
        # A date made in a document is filed where the document is (see the model).
        file_in_current_project(document_date) if document_date.document_id.nil?
        if document_date.save
          render json: DocumentDateBlueprint.render(document_date), status: :created
        else
          render json: { errors: document_date.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # Changes the day or the label, or unlinks it from its document (document_id: null).
      def update
        if @document_date.update(update_params)
          render json: DocumentDateBlueprint.render(@document_date)
        else
          render json: { errors: @document_date.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @document_date.destroy
        head :no_content
      end

      private

      def set_document_date
        @document_date = current_workspace.document_dates.includes(:document).find(params[:id])
      end

      def create_params
        params.require(:document_date).permit(:date, :label, :document_id)
      end

      # A date can be unlinked (document_id: null) but not moved to another document.
      def update_params
        attrs = params.require(:document_date).permit(:date, :label)
        attrs[:document_id] = nil if params[:document_date].key?(:document_id) && params[:document_date][:document_id].nil?
        attrs
      end
    end
  end
end

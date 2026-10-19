module Api
  module V1
    # Import JSON or YAML into a new collection (folder_id + title) or append to
    # an existing one (document_id). `preview` guesses the fields first so the
    # user can change types before importing.
    class CollectionImportsController < ApplicationController
      include WorkspaceScoped
      rescue_from CollectionImport::Error do |error|
        render json: { errors: [ error.message ] }, status: :unprocessable_entity
      end
      rescue_from ActiveRecord::RecordInvalid do |error|
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end

      def preview
        result = CollectionImport.preview(CollectionImport.parse(params.require(:text)))
        render json: { fields: result.fields, row_count: result.row_count, skipped_keys: result.skipped_keys }
      end

      def create
        rows = CollectionImport.parse(params.require(:text))
        fields = field_specs(rows)
        # A bad value raises RecordInvalid and rolls everything back, including a new collection.
        table = ActiveRecord::Base.transaction do
          CollectionImport.import!(params[:document_id] ? existing_table : new_table, rows, fields)
        end
        render json: { id: table.id, row_count: rows.size }, status: :created
      end

      private

      def field_specs(rows)
        given = params[:fields]
        return CollectionImport.preview(rows).fields if given.blank?
        given.map { |f| { name: f.require(:name), data_type: f.require(:data_type) } }
      end

      def existing_table
        current_workspace.documents.where(doc_type: :table).find(params[:document_id])
      end

      def new_table
        folder = current_workspace.folders.find(params.require(:folder_id))
        folder.documents.create!(title: params.require(:title), doc_type: :table, created_by: current_user)
      end
    end
  end
end

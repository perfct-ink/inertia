module Api
  module V1
    # Import JSON or YAML (a list of objects) into a new Collection (folder_id,
    # title) or append to an existing one (document_id). `preview` guesses the
    # fields first so the user can change types before importing; `create` takes
    # the chosen `columns` ([{ key, data_type }]) and falls back to the guesses.
    class CollectionImportsController < ApplicationController
      include WorkspaceScoped
      # The folder or collection is looked up by id across the user's Spaces; the
      # role is checked against its own Space in set_destination.
      skip_before_action :require_current_workspace_write!
      before_action :set_destination
      rescue_from CollectionImport::Error do |error|
        render json: { errors: [ error.message ] }, status: :unprocessable_entity
      end
      rescue_from ActiveRecord::RecordInvalid do |error|
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end

      def preview
        render json: CollectionImport.preview(rows, @table).as_json
      end

      def create
        parsed = rows
        # A bad value raises and rolls everything back, including a new collection.
        table = ActiveRecord::Base.transaction do
          target = @table || @folder.documents.create!(title: new_title, doc_type: :table, created_by: current_user)
          CollectionImport.import!(target, parsed, columns_for(parsed, target))
          target
        end
        render json: { id: table.id, row_count: parsed.size }, status: :created
      end

      private

      def set_destination
        if params[:document_id].present?
          @table = Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }, doc_type: :table).find(params[:document_id])
          require_write_in!(@table.folder.workspace_id)
        else
          @folder = Folder.where(workspace_id: accessible_workspace_ids).find(params.require(:folder_id))
          require_write_in!(@folder.workspace_id)
        end
      end

      def rows
        CollectionImport.parse(params.require(:text).to_s)
      end

      def new_title
        params[:title].to_s.strip.presence || "Imported collection"
      end

      # The columns the user chose, or every importable guess when none were sent.
      def columns_for(parsed, target)
        given = params[:columns]
        return given.map { |column| { key: column.require(:key), data_type: column.require(:data_type) } } if given.is_a?(Array)
        CollectionImport.preview(parsed, target).columns.select(&:importable).map { |column| { key: column.key, data_type: column.data_type } }
      end
    end
  end
end

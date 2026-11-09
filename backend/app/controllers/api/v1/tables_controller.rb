module Api
  module V1
    class TablesController < ApplicationController
      include WorkspaceScoped
      include FolderCollaboration
      # Tables are looked up by id across the user's workspaces (and the folders
      # shared with them); the role is checked against the table's own folder in
      # set_table.
      skip_before_action :require_current_workspace_write!
      before_action :set_table
      rescue_from ActiveRecord::RecordInvalid, with: :invalid_record
      rescue_from ActiveRecord::RecordNotDestroyed, with: :invalid_record
      rescue_from ActiveRecord::InvalidForeignKey do
        render json: { errors: [ "This item is still referenced by another collection" ] }, status: :unprocessable_entity
      end

      def show
        render json: {
          fields: @table.table_fields.order(:id).as_json(only: [ :id, :name, :data_type, :relation_table_id, :unit, :formula ]),
          records: @table.table_records.order(:id).includes(:table_cells).map(&:as_table_json)
        }
      end

      def create_field
        mutate { @table.table_fields.create!(field_params) }
      end

      def update_field
        mutate { @table.table_fields.find(params[:field_id]).update!(field_params) }
      end

      def destroy_field
        mutate { @table.table_fields.find(params[:field_id]).destroy! }
      end

      def create_record
        mutate { write_values(@table.table_records.create!) }
      end

      def update_record
        mutate { write_values(@table.table_records.find(params[:record_id])) }
      end

      def destroy_record
        mutate { @table.table_records.find(params[:record_id]).destroy! }
      end

      private

      def set_table
        @table = find_accessible_document(params[:id], Document.where(doc_type: :table))
        require_folder_write!(@table.folder) unless read_request?
      end

      # Serialize schema/record edits on the parent table so a field cannot
      # change type between a value's validation and persistence.
      def mutate
        @table.with_lock do
          yield
          @table.update!(content_updated_at: Time.current)
        end
        show
      end

      def field_params
        attrs = params.require(:field).permit(:name, :data_type, :relation_table_id, :unit, :formula)
        # Someone invited to a folder can only relate to collections in folders shared with them.
        attrs.delete(:relation_table_id) if attrs[:relation_table_id].present? && !shared_item?(attrs[:relation_table_id], :table)
        attrs
      end

      # For Space members every item is checked against their Space by the
      # models; for someone invited to a folder it must also be inside the share.
      def shared_item?(id, doc_type = nil)
        return true if space_member_of?(@table.folder.workspace_id)
        items = Document.where(id: id, folder_id: shared_folder_ids)
        (doc_type ? items.where(doc_type: doc_type) : items).exists?
      end

      # Cells of someone invited to a folder can only point at items inside it.
      def reject_outside_share!(field, value)
        ids = field.data_type == "relation" ? [ field.relation_table_id ] : Array(value)
        return unless %w[relation file files].include?(field.data_type) && ids.all?(Integer)
        return if ids.all? { |id| shared_item?(id) }
        field.errors.add(:base, "#{field.name} can only refer to items in the shared folder")
        raise ActiveRecord::RecordInvalid, field
      end

      def write_values(record)
        values = params.require(:record).permit(values: {}).fetch(:values, {})
        values.each do |field_id, value|
          field = @table.table_fields.find(field_id)
          reject_computed!(field)
          reject_outside_share!(field, value)
          cell = record.table_cells.find_or_initialize_by(table_field: field)
          if value.nil? || value == "" || value == []
            cell.destroy! if cell.persisted?
          else
            cell.value = field.data_type == "relation" ? nil : value
            cell.related_record = field.data_type == "relation" ? field.relation_table.table_records.find(value) : nil
            cell.save!
          end
        end
      end

      # A formula field is worked out from the record's other values, so nothing can be written to it.
      def reject_computed!(field)
        return unless field.computed?
        field.errors.add(:base, "#{field.name} is calculated from its formula and cannot be edited")
        raise ActiveRecord::RecordInvalid, field
      end

      def invalid_record(error)
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end

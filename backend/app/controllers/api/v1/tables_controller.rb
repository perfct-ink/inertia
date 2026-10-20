module Api
  module V1
    class TablesController < ApplicationController
      include WorkspaceScoped
      # Tables are looked up by id across the user's workspaces; the role is
      # checked against the table's own workspace in set_table.
      skip_before_action :require_current_workspace_write!
      before_action :set_table
      rescue_from ActiveRecord::RecordInvalid, with: :invalid_record
      rescue_from ActiveRecord::RecordNotDestroyed, with: :invalid_record
      class BadValue < StandardError; end
      rescue_from(BadValue) { |error| render json: { errors: [ error.message ] }, status: :unprocessable_entity }
      rescue_from ActiveRecord::InvalidForeignKey do
        render json: { errors: [ "This item is still referenced by another collection" ] }, status: :unprocessable_entity
      end

      def show
        backrefs = TableBackrefs.new(@table)
        reverse = backrefs.by_record
        render json: {
          fields: @table.table_fields.order(:id).as_json(only: [ :id, :name, :data_type, :relation_table_id, :allow_many ]),
          reverse_fields: backrefs.columns,
          records: @table.table_records.order(:id).includes(table_cells: [ :table_field, :links ]).map { |record| record.as_table_json.merge(reverse: reverse[record.id] || {}) }
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
        @table = Document.joins(:folder).where(folders: { workspace_id: accessible_workspace_ids }, doc_type: :table).find(params[:id])
        require_write_in!(@table.folder.workspace_id) unless read_request?
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
        params.require(:field).permit(:name, :data_type, :relation_table_id, :allow_many)
      end

      def write_values(record)
        values = params.require(:record).permit(values: {}).fetch(:values, {})
        values.each do |field_id, value|
          field = @table.table_fields.find(field_id)
          cell = record.table_cells.find_or_initialize_by(table_field: field)
          if value.nil? || value == ""
            cell.destroy! if cell.persisted?
          elsif field.data_type == "relation" && field.allow_many
            write_links(cell, field, value)
          else
            raise BadValue, "#{field.name} takes one value" if value.is_a?(Array)
            cell.value = field.data_type == "relation" ? nil : value
            cell.related_record = field.data_type == "relation" ? field.relation_table.table_records.find(value) : nil
            cell.save!
          end
        end
      end

      # A "many" relation takes a list of record ids; an empty list clears the cell.
      def write_links(cell, field, value)
        ids = Array(value).map(&:to_i).uniq
        return (cell.destroy! if cell.persisted?) if ids.empty?
        records = field.relation_table.table_records.find(ids)
        cell.value = nil
        cell.related_record = nil
        cell.save!
        cell.links.where.not(related_record_id: ids).destroy_all
        (records.map(&:id) - cell.links.pluck(:related_record_id)).each { |id| cell.links.create!(related_record_id: id) }
      end

      def invalid_record(error)
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end

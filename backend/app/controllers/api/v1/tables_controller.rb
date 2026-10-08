module Api
  module V1
    class TablesController < ApplicationController
      before_action :set_table
      rescue_from ActiveRecord::RecordInvalid, with: :invalid_record
      rescue_from ActiveRecord::RecordNotDestroyed, with: :invalid_record
      rescue_from ActiveRecord::InvalidForeignKey do
        render json: { errors: [ "This item is still referenced by another table" ] }, status: :unprocessable_entity
      end

      def show
        render json: {
          fields: @table.table_fields.order(:id).as_json(only: [ :id, :name, :data_type, :relation_table_id ]),
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
        @table = Document.joins(:folder).where(folders: { workspace_id: current_user.workspace.id }, doc_type: :table).find(params[:id])
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
        params.require(:field).permit(:name, :data_type, :relation_table_id)
      end

      def write_values(record)
        values = params.require(:record).permit(values: {}).fetch(:values, {})
        values.each do |field_id, value|
          field = @table.table_fields.find(field_id)
          cell = record.table_cells.find_or_initialize_by(table_field: field)
          if value.nil? || value == ""
            cell.destroy! if cell.persisted?
          else
            cell.value = field.data_type == "relation" ? nil : value
            cell.related_record = field.data_type == "relation" ? field.relation_table.table_records.find(value) : nil
            cell.save!
          end
        end
      end

      def invalid_record(error)
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end

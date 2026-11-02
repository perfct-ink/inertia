# Adds records to a collection from rows the browser has already read from a
# CSV file and converted to each field's type (frontend data/collectionCsv.ts).
# `columns` says where each position of a row goes: { field_id: } for an
# existing field, or { name:, data_type: } for a field to create. Row numbers
# in errors count the header as row 1, as a spreadsheet does.
#
# Every value is checked by the same TableCell rules as a hand-typed record.
# Call it inside the table's lock (TablesController#mutate): any Error undoes
# the whole import, new fields included.
class TableCsvImport
  class Error < StandardError; end

  # An import runs inside one request, and each cell is validated and saved
  # one by one, so the size is kept small. Mirrors MAX_IMPORT_ROWS and
  # MAX_IMPORT_CELLS in the frontend.
  MAX_ROWS = 1_000
  MAX_CELLS = 10_000

  def initialize(table, columns:, rows:)
    @table = table
    @columns = columns.is_a?(Array) ? columns : []
    @rows = rows.is_a?(Array) ? rows : []
  end

  # The number of records created.
  def run!
    check_shape!
    fields = resolve_fields
    @rows.each_with_index { |row, index| import_row(row, fields, index + 2) }
    @rows.size
  end

  private

  def check_shape!
    raise Error, "Choose at least one column to import." if @columns.empty?
    raise Error, "The file has no records to import." if @rows.empty?
    raise Error, "At most #{MAX_ROWS} records can be imported at once." if @rows.size > MAX_ROWS
    raise Error, "At most #{MAX_CELLS} cells can be imported at once." if @rows.size * @columns.size > MAX_CELLS
    @rows.each_with_index do |row, index|
      next if row.is_a?(Array) && row.size == @columns.size
      raise Error, "Row #{index + 2} does not have a value for each of the #{@columns.size} #{"column".pluralize(@columns.size)}."
    end
  end

  # One field per column, in column order. New fields are created here.
  def resolve_fields
    existing = @table.table_fields.index_by(&:id)
    used = Set.new
    @columns.each_with_index.map do |column, index|
      raise Error, "Column #{index + 1} is not valid." unless column.is_a?(Hash)
      spec = column.with_indifferent_access
      field = spec[:field_id].present? ? existing[spec[:field_id].to_i] : create_field(spec, index)
      raise Error, "Column #{index + 1} names a field that is not in this collection." unless field
      raise Error, "More than one column is set to import into #{field.name}." unless used.add?(field.id)
      field
    end
  end

  def create_field(spec, index)
    name = spec[:name].to_s.strip
    raise Error, "Column #{index + 1} needs a name for its new field." if name.empty?
    @table.table_fields.create!(name: name, data_type: spec[:data_type].to_s)
  rescue ActiveRecord::RecordInvalid => e
    raise Error, "Field #{name}: #{e.record.errors.full_messages.to_sentence}."
  end

  def import_row(row, fields, number)
    record = @table.table_records.create!
    fields.zip(row).each do |field, raw|
      write_cell(record, field, raw, number) unless raw.nil? || raw == ""
    end
  end

  def write_cell(record, field, raw, number)
    cell = record.table_cells.new(table_field: field)
    if field.data_type == "relation"
      cell.related_record = linked_record(field, raw)
      raise Error, "Row #{number}, #{field.name}: there is no record #{raw} in #{field.relation_table.title}." unless cell.related_record
    else
      cell.value = raw
    end
    cell.save!
  rescue ActiveRecord::RecordInvalid => e
    raise Error, "Row #{number}, #{field.name}: #{e.record.errors.full_messages.to_sentence}."
  end

  def linked_record(field, raw)
    field.relation_table.table_records.find_by(id: raw) if raw.is_a?(Integer)
  end
end

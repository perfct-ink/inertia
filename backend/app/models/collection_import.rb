# Turns pasted JSON or YAML (an array of objects) into a collection's fields
# and records. Keys become fields, in order of first appearance; each field's
# type is guessed from its values and can be overridden before importing.
# Nested objects and arrays are skipped (and reported), not flattened.
class CollectionImport
  class Error < StandardError; end

  MAX_ROWS = 5_000
  ISO_DATE = /\A\d{4}-\d{2}-\d{2}\z/
  ISO_DATETIME = /\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/
  GUESSABLE = %w[boolean integer number date datetime text].freeze

  Result = Struct.new(:fields, :row_count, :skipped_keys, keyword_init: true)

  def self.parse(text)
    data = begin
      JSON.parse(text)
    rescue JSON::ParserError
      YAML.safe_load(text, permitted_classes: [ Date, Time ], aliases: false)
    end
    data = data.values.first if data.is_a?(Hash) && data.size == 1 && data.values.first.is_a?(Array)
    raise Error, "Expected a list of objects" unless data.is_a?(Array) && data.all?(Hash)
    raise Error, "Nothing to import" if data.empty?
    raise Error, "At most #{MAX_ROWS} rows can be imported at once" if data.size > MAX_ROWS
    data.map { |row| row.transform_keys(&:to_s).transform_values { |v| normalize(v) } }
  rescue Psych::Exception => e
    raise Error, "Couldn't read that as JSON or YAML: #{e.message.lines.first.to_s.strip}"
  end

  # The fields a table would get: [{ name:, data_type: }], plus keys skipped.
  def self.preview(rows)
    keys = rows.flat_map(&:keys).uniq
    skipped = keys.select { |key| rows.any? { |row| nested?(row[key]) } }
    fields = (keys - skipped).map { |key| { name: key, data_type: guess_type(rows.map { |row| row[key] }) } }
    Result.new(fields: fields, row_count: rows.size, skipped_keys: skipped)
  end

  # Imports rows into `table`. `fields` is [{ name:, data_type: }]; a field that
  # already exists on the table is matched by name (its own type wins).
  def self.import!(table, rows, fields)
    table.with_lock do
      by_name = table.table_fields.index_by(&:name)
      columns = fields.map do |spec|
        name = spec.fetch(:name).to_s
        by_name[name] ||= table.table_fields.create!(name: name, data_type: spec.fetch(:data_type).to_s)
      end
      rows.each do |row|
        record = table.table_records.create!
        columns.each do |field|
          value = coerce(row[field.name], field.data_type)
          next if value.nil?
          record.table_cells.create!(table_field: field, value: value)
        end
      end
      table.update!(content_updated_at: Time.current)
    end
    table
  end

  def self.normalize(value)
    case value
    when Time then value.utc.iso8601
    when Date then value.iso8601
    else value
    end
  end

  def self.nested?(value)
    value.is_a?(Hash) || value.is_a?(Array)
  end

  def self.guess_type(values)
    present = values.compact
    return "text" if present.empty?
    return "boolean" if present.all? { |v| v == true || v == false }
    return "integer" if present.all?(Integer)
    return "number" if present.all? { |v| v.is_a?(Numeric) }
    return "datetime" if present.all? { |v| v.is_a?(String) && v.match?(ISO_DATETIME) }
    return "date" if present.all? { |v| v.is_a?(String) && v.match?(ISO_DATE) }
    "text"
  end

  # Brings a raw value in line with the field's type where that is unambiguous
  # (numbers as strings, scalars as text); anything else is left for the cell
  # validation to reject with a clear error.
  def self.coerce(value, data_type)
    return nil if value.nil? || value == ""
    case data_type
    when "text", "long_text" then nested?(value) ? value.to_json : value.to_s
    when "integer" then value.is_a?(String) && value.match?(/\A-?\d+\z/) ? value.to_i : value
    when "number" then value.is_a?(String) && value.match?(/\A-?\d+(\.\d+)?\z/) ? value.to_f : value
    else value
    end
  end
  private_class_method :normalize, :nested?, :guess_type, :coerce
end

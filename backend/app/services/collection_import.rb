require "date"
require "json"
require "yaml"

# Turns JSON or YAML (a list of objects) into a Collection's fields and records.
# Keys become fields, in order of first appearance, each with a type guessed
# from its values that the user can change before importing. It can fill a new
# Collection or append to an existing one, matching keys to field names.
#
# Field types are not decided here. What a type accepts is TableCell's rule, and
# this class asks it: a guess is the first type whose rule every value passes,
# and each value is saved as a TableCell, which rejects (and, once the field
# types branch is in, also normalizes) whatever does not fit. The types a key can
# become are TableField::DATA_TYPES less the ones an import cannot fill, so new
# types appear in the import without changing this file.
#
# Nested objects and arrays are skipped (and reported): turning them into a
# related Collection needs one-to-many relationships (see the backlog).
class CollectionImport
  class Error < StandardError; end

  MAX_BYTES = 5_000_000
  # Each cell is saved and validated one by one, so the size of an import is capped.
  MAX_ROWS = 1_000
  MAX_FIELDS = 100
  MAX_PROBLEMS_SHOWN = 10

  # Types an import never fills: they hold a link to another record or file,
  # are numbered or read from the record, or are worked out from a formula.
  UNIMPORTABLE = %w[relation file files person auto_number created_time updated_time formula].freeze
  # Types that need their choices defined on the field first.
  NEEDS_OPTIONS = %w[single_select multi_select].freeze
  # Tried in this order; the first type that every value of a key fits is the guess, else text.
  GUESS_ORDER = %w[boolean integer number datetime date].freeze
  TEXT_TYPES = %w[text long_text].freeze

  # data_type is the field's own type when the key matches an existing field
  # (field_id and field_name say which), and `importable` is false when that
  # field cannot take imported values.
  Column = Struct.new(:key, :data_type, :field_id, :field_name, :importable, keyword_init: true)
  Preview = Struct.new(:row_count, :columns, :skipped_keys, :types, keyword_init: true)

  class << self
    # The rows of a text: [{ "key" => scalar }]. JSON is tried first, then YAML.
    def parse(text)
      raise Error, "That file is too large (the limit is #{MAX_BYTES / 1_000_000} MB)" if text.bytesize > MAX_BYTES
      data = read(text)
      data = data.values.first if data.is_a?(Hash) && data.size == 1 && data.values.first.is_a?(Array)
      raise Error, "Expected a list of objects, such as [{\"name\": \"Ada\"}]" unless data.is_a?(Array) && data.all?(Hash)
      raise Error, "Nothing to import" if data.empty?
      raise Error, "At most #{MAX_ROWS} rows can be imported at once (this has #{data.size})" if data.size > MAX_ROWS
      rows = data.map { |row| row.to_h { |key, value| [ key.to_s, normalize(value) ] } }
      raise Error, "At most #{MAX_FIELDS} fields can be imported at once" if rows.flat_map(&:keys).uniq.size > MAX_FIELDS
      rows
    end

    # What importing `rows` would do. With `table`, keys that match one of its
    # fields (by name, ignoring case) use that field; the rest become new ones.
    def preview(rows, table = nil)
      keys = rows.flat_map(&:keys).uniq
      skipped = keys.select { |key| rows.any? { |row| nested?(row[key]) } }
      kept = keys - skipped
      matches = match_fields(kept, table ? table.table_fields.order(:id).to_a : [])
      fit = Fit.new
      columns = kept.map do |key|
        field = matches[key]
        if field
          Column.new(key: key, data_type: field.data_type, field_id: field.id, field_name: field.name, importable: importable_field?(field))
        else
          Column.new(key: key, data_type: guess_type(rows.map { |row| row[key] }, fit), importable: true)
        end
      end
      Preview.new(row_count: rows.size, columns: columns, skipped_keys: skipped, types: creatable_types)
    end

    # Writes the rows into `table`. `columns` is [{ key:, data_type: }], the keys
    # to import; a key matching an existing field uses that field (its own type
    # wins), the others create a field of data_type. Nothing is kept if any value
    # does not fit: the Error rolls the transaction back (the caller's too, so a
    # Collection made for the import goes with it). Returns the number of rows.
    def import!(table, rows, columns)
      raise Error, "Choose at least one field to import" if columns.empty?
      problems = []
      table.with_lock do
        targets = targets_for(table, columns)
        rows.each_with_index do |row, index|
          record = table.table_records.create!
          targets.each do |key, field|
            if nested?(row[key])
              problems << "row #{index + 1}, #{field.name}: nested objects and lists cannot be imported"
              next
            end
            value = cell_value(row[key], field)
            next if value.nil?
            cell = record.table_cells.build(table_field: field, value: value)
            problems << "row #{index + 1}, #{field.name}: #{cell.errors.full_messages.to_sentence}" unless cell.save
          end
        end
        raise Error, problem_summary(problems) if problems.any?
        table.update!(content_updated_at: Time.current)
      end
      rows.size
    end

    # { key => field } for the keys that match a field by name: exact matches
    # first, then ignoring case and surrounding spaces, each field used once.
    def match_fields(keys, fields)
      matches = {}
      by_name = fields.to_h { |field| [ field.name, field ] }
      keys.each { |key| matches[key] = by_name[key] if by_name.key?(key) }
      keys.each do |key|
        next if matches.key?(key)
        field = fields.find { |candidate| !matches.value?(candidate) && candidate.name.strip.casecmp?(key.strip) }
        matches[key] = field if field
      end
      matches
    end

    # The type for a key's values: the first of GUESS_ORDER that fits them all.
    # `fit` answers fit.call(type, value); empty values do not count.
    def guess_type(values, fit)
      present = values.reject { |value| blank_value?(value) }.uniq
      return "text" if present.empty?
      (GUESS_ORDER & creatable_types).find { |type| present.all? { |value| fit.call(type, value) } } || "text"
    end

    # The types a new field made by an import can have.
    def creatable_types
      TableField::DATA_TYPES - UNIMPORTABLE - NEEDS_OPTIONS
    end

    private

    def read(text)
      JSON.parse(text)
    rescue JSON::ParserError
      begin
        YAML.safe_load(text, permitted_classes: [ Date, Time ], aliases: false)
      rescue Psych::Exception => e
        raise Error, "Couldn't read that as JSON or YAML: #{e.message.lines.first.to_s.strip}"
      end
    end

    # YAML reads dates and times as Date and Time; fields store them as text.
    def normalize(value)
      case value
      when Time then value.utc.iso8601
      when Date then value.iso8601
      else value
      end
    end

    def nested?(value)
      value.is_a?(Hash) || value.is_a?(Array)
    end

    def blank_value?(value)
      value.nil? || value == ""
    end

    def importable_field?(field)
      !UNIMPORTABLE.include?(field.data_type)
    end

    def targets_for(table, columns)
      keys = columns.map { |column| column.fetch(:key).to_s }
      raise Error, "A field was chosen twice" if keys.uniq.size != keys.size
      matches = match_fields(keys, table.table_fields.order(:id).to_a)
      columns.to_h do |column|
        key = column.fetch(:key).to_s
        field = matches[key] || create_field(table, key, column.fetch(:data_type).to_s)
        raise Error, "#{field.name} is a #{field.data_type} field and cannot be filled by an import" unless importable_field?(field)
        [ key, field ]
      end
    end

    def create_field(table, name, type)
      raise Error, "#{name} cannot be imported as a #{type} field" unless creatable_types.include?(type)
      table.table_fields.create!(name: name, data_type: type)
    end

    # A column guessed as text may hold numbers or booleans too; they become their text.
    def cell_value(value, field)
      return nil if blank_value?(value)
      TEXT_TYPES.include?(field.data_type) && !value.is_a?(String) ? value.to_s : value
    end

    def problem_summary(problems)
      shown = problems.first(MAX_PROBLEMS_SHOWN).join("; ")
      more = problems.size > MAX_PROBLEMS_SHOWN ? " (and #{problems.size - MAX_PROBLEMS_SHOWN} more)" : ""
      "Nothing was imported, because #{problems.size} #{problems.size == 1 ? 'value does' : 'values do'} not fit: #{shown}#{more}"
    end
  end

  # Asks TableCell's rule for a type whether a value fits, in memory: nothing is
  # saved. valid_value is the one place that rule lives, so the import never
  # keeps a copy of it.
  class Fit
    def initialize
      @collection = Document.new(doc_type: :table)
      @record = TableRecord.new(document: @collection)
      @fields = {}
    end

    def call(type, value)
      field = (@fields[type] ||= TableField.new(document: @collection, name: type, data_type: type))
      cell = TableCell.new(table_record: @record, table_field: field, value: value)
      cell.send(:valid_value)
      cell.errors[:value].empty?
    end
  end
end

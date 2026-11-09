module AgentTools
  # Collections (documents with doc_type table): read the fields and records, and
  # add or change a record. Agents cannot change a Collection's fields or delete records.
  module Collections
    MAX_RECORDS = 500
    # Field types an agent may write. Relations (they point at another Collection's
    # records), files (they point at documents) and formulas (worked out from other
    # values) are read-only here.
    WRITABLE_TYPES = %w[text integer number boolean date datetime].freeze

    def self.tool(**options)
      AgentTools::Tool.new(**options)
    end

    TOOLS = [
      tool(name: "read_collection", write: false,
           description: "Read a Collection's fields and records.",
           schema: AgentTools.object({ "id" => { "type" => "integer" } }, required: %w[id]),
           handler: ->(token, args) { Collections.read_collection(token, args) }),
      tool(name: "write_collection_record", write: true,
           description: "Add a record to a Collection, or change one when record_id is given. values is keyed by field name; null clears a value. Relation, file and formula fields cannot be written.",
           schema: AgentTools.object({ "id" => { "type" => "integer" }, "record_id" => { "type" => "integer" }, "values" => { "type" => "object" } }, required: %w[id values]),
           handler: ->(token, args) { Collections.write_collection_record(token, args) })
    ].freeze

    def self.read_collection(token, args)
      table = AgentTools.document!(token, args["id"], types: %w[table])
      fields = table.table_fields.order(:id).to_a
      names = fields.index_by(&:id)
      records = table.table_records.order(:id).limit(MAX_RECORDS + 1).includes(:table_cells).to_a
      {
        id: table.id, title: table.title,
        fields: fields.map { |f| { id: f.id, name: f.name, type: f.data_type, unit: f.unit, formula: f.formula, writable: writable?(f) }.compact },
        records: records.first(MAX_RECORDS).map do |record|
          { id: record.id, values: record.table_cells.to_h { |cell| [ names[cell.table_field_id]&.name, cell.related_record_id || cell.value ] } }
        end,
        truncated: records.size > MAX_RECORDS
      }
    end

    def self.write_collection_record(token, args)
      table = AgentTools.document!(token, args["id"], types: %w[table])
      values = args["values"]
      raise AgentTools::Error, "values must be an object keyed by field name" unless values.is_a?(Hash)

      table.lock!
      record = if args["record_id"].present?
        table.table_records.find_by(id: AgentTools.integer(args["record_id"])) || raise(AgentTools::Error, "Record #{args['record_id']} not found")
      else
        table.table_records.build
      end
      fields = values.keys.index_with { |name| table.table_fields.find_by(name: name) || raise(AgentTools::Error, "No field named “#{name}”") }
      fields.each do |name, field|
        raise AgentTools::Error, "“#{name}” is a #{field.data_type} field and cannot be written here" unless writable?(field)
      end
      record.save!
      fields.each do |name, field|
        cell = record.table_cells.find_or_initialize_by(table_field: field)
        value = values[name]
        if value.nil? || value == "" || value == []
          cell.destroy! if cell.persisted?
        else
          cell.value = value
          cell.save!
        end
      end
      table.update!(content_updated_at: Time.current)
      AgentTools.record_activity(token, "wrote_record", table, "#{args['record_id'].present? ? 'Changed' : 'Added'} record ##{record.id} in “#{table.title}”")
      { id: table.id, record_id: record.id }
    end

    def self.writable?(field)
      WRITABLE_TYPES.include?(field.data_type)
    end
  end
end

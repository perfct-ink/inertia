# One-off copy of the old DigitalOcean MySQL database into PostgreSQL, run by
# `bin/rails db:import_mysql` on boot, before db:prepare. On an empty database
# it loads schema.rb itself, so db:prepare doesn't seed tables the copy is
# about to fill. The target must hold no data; once the copy commits, a marker
# row in ar_internal_metadata makes every later run a no-op.
#
# The source is the `mysql_import` entry in config/database.yml (the MySQL
# settings production used before the switch). MYSQL_IMPORT_URL overrides it,
# e.g. mysql2://root@127.0.0.1/app_development for a local copy.
class MysqlImport
  MARKER = "mysql_imported_at".freeze
  SKIPPED_TABLES = %w[schema_migrations ar_internal_metadata].freeze
  BATCH_SIZE = 1000

  class Error < StandardError; end

  class SourceRecord < ActiveRecord::Base
    self.abstract_class = true
  end

  def self.source_config(name = "primary")
    url = ENV["MYSQL_IMPORT_URL"].presence
    return { "url" => url } if url && name == "primary"

    config = ActiveRecord::Base.configurations.configs_for(env_name: "mysql_import", name: name)
    config if config && config.configuration_hash[:host].present?
  end

  def self.default_target
    defined?(::ApplicationRecord) ? ::ApplicationRecord : ActiveRecord::Base
  end

  # Loads the schema into a still-empty Postgres database, then copies.
  def self.boot(target: default_target, source: source_config)
    importer = new(source, target: target)
    importer.load_schema_if_empty
    importer.run
  end

  def initialize(source_config = self.class.source_config, target: self.class.default_target, log: $stdout)
    @source_config = source_config
    @target_class = target
    @log = log
  end

  def target
    @target_class.connection
  end

  def imported_at
    metadata[MARKER]
  end

  def load_schema_if_empty
    return unless target.adapter_name == "PostgreSQL" && @source_config.present?
    return if (target.tables - SKIPPED_TABLES).any?

    say("MySQL import: empty database, loading schema")
    ActiveRecord::Tasks::DatabaseTasks.load_schema(@target_class.connection_db_config)
    @target_class.connection_pool.disconnect!
  end

  def run
    return say("MySQL import: target isn't PostgreSQL, skipping") unless target.adapter_name == "PostgreSQL"
    return say("MySQL import: no source configured, skipping") if @source_config.blank?
    return say("MySQL import: already done at #{imported_at}") if imported_at

    tables = target.tables - SKIPPED_TABLES
    filled = tables.select { |table| target.select_value("SELECT 1 FROM #{target.quote_table_name(table)} LIMIT 1") }
    raise Error, "PostgreSQL already has data in #{filled.join(', ')}; refusing to overwrite it" if filled.any?

    @connected = SourceRecord.establish_connection(@source_config)
    missing = tables - SourceRecord.connection.tables

    counts = {}
    target.transaction do
      # Rows arrive table by table, so foreign keys come off for the copy and
      # go back on at the end, which checks every row against them. (Dropping
      # them only needs table ownership; disabling their triggers would need a
      # superuser.)
      foreign_keys = tables.flat_map { |table| target.foreign_keys(table) }
      foreign_keys.each { |fk| target.remove_foreign_key(fk.from_table, name: fk.name) }
      (tables - missing).each { |table| counts[table] = copy(table) }
      foreign_keys.each { |fk| target.add_foreign_key(fk.from_table, fk.to_table, **fk.options) }
      tables.each { |table| target.reset_pk_sequence!(table) }
      metadata[MARKER] = Time.now.utc.iso8601
    end

    counts.each { |table, count| say("MySQL import: #{table}: #{count} rows") }
    say("MySQL import: tables not in MySQL, left empty: #{missing.join(', ')}") if missing.any?
    counts
  ensure
    SourceRecord.remove_connection if @connected
  end

  private

  def copy(table)
    source = model(SourceRecord, table)
    destination = model(@target_class, table)
    columns = destination.column_names & source.column_names
    count = 0
    # Reading through models (not raw SQL) casts MySQL's tinyint booleans and
    # JSON strings to Ruby values, which insert_all then writes in Postgres'
    # own types.
    each_batch(source.select(columns), source.primary_key, columns) do |records|
      rows = records.map { |record| columns.index_with { |column| clean(record[column]) } }
      destination.insert_all!(rows, **insert_options)
      count += rows.size
    end
    count
  end

  # in_batches needs a primary key; join tables without one are paged by offset.
  def each_batch(scope, primary_key, columns)
    if primary_key.is_a?(String) && columns.include?(primary_key)
      scope.in_batches(of: BATCH_SIZE) { |batch| yield batch.to_a }
    else
      offset = 0
      loop do
        records = scope.order(*columns).limit(BATCH_SIZE).offset(offset).to_a
        break if records.empty?

        yield records
        offset += BATCH_SIZE
      end
    end
  end

  # Postgres rejects NUL bytes in text columns; MySQL allowed them.
  def clean(value)
    value.is_a?(String) && value.include?("\u0000") ? value.delete("\u0000") : value
  end

  # Rails 7 started filling created_at/updated_at in insert_all; keep the
  # copied values as they are.
  def insert_options
    ActiveRecord.version >= Gem::Version.new("7.0") ? { record_timestamps: false } : {}
  end

  # ar_internal_metadata is a class with class methods before Rails 7.1 and an
  # object bound to a connection pool from 7.1 on.
  def metadata
    if ActiveRecord::InternalMetadata.respond_to?(:[])
      ActiveRecord::InternalMetadata
    else
      ActiveRecord::InternalMetadata.new(@target_class.connection_pool)
    end
  end

  def model(base, table)
    Class.new(base) do
      self.table_name = table
      self.inheritance_column = nil
      def self.name
        "MysqlImport::Row"
      end
    end
  end

  def say(message)
    @log&.puts(message)
  end
end

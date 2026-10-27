# One-off copy of the old DigitalOcean MySQL database into PostgreSQL, run by
# `bin/rails db:import_mysql` (and by bin/docker-entrypoint on boot). The
# target must already have the schema (db:prepare) and no data; once the copy
# commits, a marker row in ar_internal_metadata makes every later run a no-op.
#
# The source is read from the encrypted Rails credentials (database.host,
# port, username, password; database inertia_production), the same values
# production used while it ran on MySQL. MYSQL_IMPORT_URL overrides them,
# e.g. mysql2://root:password@127.0.0.1/inertia_development for a local copy.
class MysqlImport
  MARKER = "mysql_imported_at".freeze
  SKIPPED_TABLES = %w[schema_migrations ar_internal_metadata].freeze
  BATCH_SIZE = 1000

  class Error < StandardError; end

  class SourceRecord < ActiveRecord::Base
    self.abstract_class = true
  end

  def self.source_config
    url = ENV["MYSQL_IMPORT_URL"].presence
    return { url: url } if url

    creds = Rails.application.credentials.database
    return nil unless creds&.dig(:host).present?

    {
      adapter: "mysql2", encoding: "utf8mb4", database: "inertia_production",
      host: creds[:host], port: creds[:port], username: creds[:username], password: creds[:password]
    }
  end

  def initialize(source_config = self.class.source_config, log: $stdout)
    @source_config = source_config
    @log = log
  end

  def target
    ApplicationRecord.connection
  end

  def imported_at
    ActiveRecord::InternalMetadata.new(ActiveRecord::Base.connection_pool)[MARKER]
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
      # Rows arrive table by table, so foreign keys (including tasks' and
      # folders' parent_id) are checked once at the end instead of per row.
      target.disable_referential_integrity do
        (tables - missing).each { |table| counts[table] = copy(table) }
      end
      target.check_all_foreign_keys_valid!
      tables.each { |table| target.reset_pk_sequence!(table) }
      ActiveRecord::InternalMetadata.new(ActiveRecord::Base.connection_pool)[MARKER] = Time.current.utc.iso8601
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
    destination = model(ApplicationRecord, table)
    columns = destination.column_names & source.column_names
    count = 0
    # Reading through models (not raw SQL) casts MySQL's tinyint booleans and
    # JSON strings to Ruby values, which insert_all then writes in Postgres'
    # own types.
    source.select(columns).in_batches(of: BATCH_SIZE) do |batch|
      rows = batch.map { |record| record.attributes.slice(*columns) }
      destination.insert_all!(rows, record_timestamps: false)
      count += rows.size
    end
    count
  end

  def model(base, table)
    Class.new(base) do
      self.table_name = table
      self.inheritance_column = nil
      def self.name = "MysqlImport::Row"
    end
  end

  def say(message)
    @log&.puts(message)
  end
end

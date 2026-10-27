require "test_helper"

# The copy itself needs a MySQL server, so it was checked by hand (see
# docs/features/postgresql_database.md); these cover the guards that keep it
# from ever overwriting PostgreSQL data.
class MysqlImportTest < ActiveSupport::TestCase
  SOURCE = { url: "mysql2://nobody@127.0.0.1:1/missing" }.freeze

  test "does nothing without a source" do
    assert_nil MysqlImport.new(nil, log: nil).run
  end

  test "refuses to copy into a database that already has data" do
    User.create!(name: "Ada", email: "ada@example.com", password: "password123")

    error = assert_raises(MysqlImport::Error) { MysqlImport.new(SOURCE, log: nil).run }
    assert_includes error.message, "users"
  end

  test "is a no-op once the import is recorded" do
    ActiveRecord::InternalMetadata.new(ActiveRecord::Base.connection_pool)[MysqlImport::MARKER] = "2026-10-25T00:00:00Z"

    assert_nil MysqlImport.new(SOURCE, log: nil).run
  end
end

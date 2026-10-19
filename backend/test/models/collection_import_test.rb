require "test_helper"

class CollectionImportTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "import-ada@example.com", password: "password123")
    folder = @user.workspace.folders.create!(name: "Data")
    @table = folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
  end

  test "parses JSON and YAML, and unwraps a single top-level list" do
    json = CollectionImport.parse('[{"name": "Ada", "age": 36}]')
    yaml = CollectionImport.parse("people:\n  - name: Ada\n    age: 36\n")
    assert_equal [ { "name" => "Ada", "age" => 36 } ], json
    assert_equal json, yaml
  end

  test "rejects things that are not a list of objects" do
    assert_raises(CollectionImport::Error) { CollectionImport.parse('{"a": 1, "b": 2}') }
    assert_raises(CollectionImport::Error) { CollectionImport.parse("[1, 2]") }
    assert_raises(CollectionImport::Error) { CollectionImport.parse("[]") }
    assert_raises(CollectionImport::Error) { CollectionImport.parse("a: [unclosed") }
  end

  test "guesses field types from values and reports nested keys" do
    rows = CollectionImport.parse(<<~YAML)
      - name: Ada
        age: 36
        score: 9.5
        active: true
        born: 1990-01-02
        seen: "2026-10-04T10:30:00Z"
        tags: [a, b]
      - name: Grace
        age: 40
        score: 8
        active: false
        born: 1985-12-09
        seen: "2026-10-05T10:30:00Z"
        tags: []
    YAML
    result = CollectionImport.preview(rows)
    assert_equal 2, result.row_count
    assert_equal [ "tags" ], result.skipped_keys
    assert_equal(
      { "name" => "text", "age" => "integer", "score" => "number", "active" => "boolean", "born" => "date", "seen" => "datetime" },
      result.fields.to_h { |f| [ f[:name], f[:data_type] ] }
    )
  end

  test "imports records into new fields and skips missing values" do
    rows = [ { "name" => "Ada", "age" => 36 }, { "name" => "Grace" } ]
    CollectionImport.import!(@table, rows, [ { name: "name", data_type: "text" }, { name: "age", data_type: "integer" } ])
    assert_equal %w[name age], @table.table_fields.order(:id).pluck(:name)
    assert_equal 2, @table.table_records.count
    assert_equal 3, TableCell.where(table_record: @table.table_records).count
  end

  test "appends to an existing collection, matching keys to field names" do
    existing = @table.table_fields.create!(name: "name", data_type: "text")
    CollectionImport.import!(@table, [ { "name" => "Ada", "city" => "Paris" } ], [ { name: "name", data_type: "integer" }, { name: "city", data_type: "text" } ])
    assert_equal "text", existing.reload.data_type
    assert_equal %w[name city], @table.table_fields.order(:id).pluck(:name)
  end

  test "coerces numeric strings and rolls back on an invalid value" do
    CollectionImport.import!(@table, [ { "n" => "42", "x" => "1.5" } ], [ { name: "n", data_type: "integer" }, { name: "x", data_type: "number" } ])
    assert_equal [ 42, 1.5 ], TableCell.order(:id).map(&:value)
    assert_raises(ActiveRecord::RecordInvalid) do
      ActiveRecord::Base.transaction do
        CollectionImport.import!(@table, [ { "n" => "abc" } ], [ { name: "n", data_type: "integer" } ])
      end
    end
  end
end

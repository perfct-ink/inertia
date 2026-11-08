require "test_helper"

class CollectionImportTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "import-ada@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Data")
    @table = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
  end

  def preview(text, table = nil)
    CollectionImport.preview(CollectionImport.parse(text), table)
  end

  def import(text, columns, table = @table)
    CollectionImport.import!(table, CollectionImport.parse(text), columns)
  end

  def values(table)
    fields = table.table_fields.order(:id).to_a
    table.table_records.order(:id).map { |record| fields.to_h { |field| [ field.name, record.table_cells.find_by(table_field: field)&.value ] } }
  end

  test "parses JSON, YAML and a single list under one key" do
    assert_equal [ { "a" => 1 } ], CollectionImport.parse('[{"a":1}]')
    assert_equal [ { "a" => 1 } ], CollectionImport.parse("- a: 1\n")
    assert_equal [ { "a" => 1 } ], CollectionImport.parse('{"people":[{"a":1}]}')
  end

  test "YAML dates and times are read as ISO text" do
    rows = CollectionImport.parse("- born: 2026-01-05\n  seen: 2026-01-05 10:00:00 Z\n")
    assert_equal({ "born" => "2026-01-05", "seen" => "2026-01-05T10:00:00Z" }, rows.first)
  end

  test "text that is not a list of objects is refused with a reason" do
    [ "not a list", "[1, 2]", "[]", '[{"a":1}', "- !ruby/object:Object {}\n" ].each do |text|
      assert_raises(CollectionImport::Error, text) { CollectionImport.parse(text) }
    end
    assert_raises(CollectionImport::Error) { CollectionImport.parse(Array.new(CollectionImport::MAX_ROWS + 1) { { "a" => 1 } }.to_json) }
  end

  test "preview guesses each key's type through TableCell's rules and reports nested keys" do
    result = preview('[{"name":"Ada","age":36,"score":1.5,"on":true,"born":"2026-01-05","seen":"2026-01-05T10:00:00Z","tags":["a"],"mixed":1},{"name":"Bo","age":null,"mixed":"x"}]')
    assert_equal 2, result.row_count
    assert_equal %w[tags], result.skipped_keys
    assert_equal(
      { "name" => "text", "age" => "integer", "score" => "number", "on" => "boolean", "born" => "date", "seen" => "datetime", "mixed" => "text" },
      result.columns.to_h { |column| [ column.key, column.data_type ] }
    )
    assert_equal CollectionImport.creatable_types, result.types
    assert_not_includes result.types, "relation"
  end

  test "the types an import can make are the table's types without links and calculated ones" do
    assert_empty CollectionImport.creatable_types & CollectionImport::UNIMPORTABLE
    assert_empty CollectionImport.creatable_types - TableField::DATA_TYPES
    assert_includes CollectionImport.creatable_types, "text"
  end

  test "importing creates the fields in key order and the records" do
    count = import('[{"name":"Ada","age":36,"on":false},{"name":"Bo","age":0}]', [
      { key: "name", data_type: "text" }, { key: "age", data_type: "integer" }, { key: "on", data_type: "boolean" }
    ])
    assert_equal 2, count
    assert_equal %w[name age on], @table.table_fields.order(:id).pluck(:name)
    assert_equal [ { "name" => "Ada", "age" => 36, "on" => false }, { "name" => "Bo", "age" => 0, "on" => nil } ], values(@table)
    assert_not_nil @table.reload.content_updated_at
  end

  test "a column the user changed to another type is imported as that type" do
    import('[{"age":36}]', [ { key: "age", data_type: "number" } ])
    assert_equal "number", @table.table_fields.find_by!(name: "age").data_type
  end

  test "appending matches keys to field names and keeps the field's own type" do
    name = @table.table_fields.create!(name: "Name", data_type: "text")
    age = @table.table_fields.create!(name: "Age", data_type: "integer")
    result = preview('[{"name":"Ada","AGE":36,"city":"Paris"}]', @table)
    assert_equal [ name.id, age.id, nil ], result.columns.map(&:field_id)
    assert_equal %w[text integer text], result.columns.map(&:data_type)

    import('[{"name":"Ada","AGE":36,"city":"Paris"}]', [ { key: "name", data_type: "text" }, { key: "AGE", data_type: "text" }, { key: "city", data_type: "text" } ])
    assert_equal 3, @table.table_fields.count
    assert_equal [ { "Name" => "Ada", "Age" => 36, "city" => "Paris" } ], values(@table)
  end

  test "an exact name match wins over a match that ignores case" do
    field = Struct.new(:id, :name)
    exact = field.new(1, "name")
    other = field.new(2, "Name")
    matches = CollectionImport.match_fields(%w[name Name NAME], [ exact, other ])
    assert_equal({ "name" => exact, "Name" => other }, matches)
  end

  test "a field that links or calculates cannot be imported into" do
    target = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    @table.table_fields.create!(name: "Company", data_type: "relation", relation_table: target)
    result = preview('[{"Company":"Acme"}]', @table)
    assert_equal [ false ], result.columns.map(&:importable)
    assert_raises(CollectionImport::Error) { import('[{"Company":"Acme"}]', [ { key: "Company", data_type: "text" } ]) }
    assert_equal 0, @table.table_records.count
  end

  test "a type an import cannot make is refused" do
    assert_raises(CollectionImport::Error) { import('[{"a":1}]', [ { key: "a", data_type: "relation" } ]) }
    assert_raises(CollectionImport::Error) { import('[{"a":1}]', [ { key: "a", data_type: "nonsense" } ]) }
    assert_raises(CollectionImport::Error) { import('[{"a":1}]', []) }
  end

  test "a value that does not fit stops the import with the rows and fields at fault and keeps nothing" do
    error = assert_raises(CollectionImport::Error) do
      ActiveRecord::Base.transaction do
        import('[{"age":1},{"age":"old"},{"age":2.5}]', [ { key: "age", data_type: "integer" } ])
      end
    end
    assert_match(/row 2, age/, error.message)
    assert_match(/row 3, age/, error.message)
    assert_equal 0, @table.reload.table_records.count
    assert_equal 0, @table.table_fields.count
  end

  test "a nested value sent for a column is refused, not saved as text" do
    error = assert_raises(CollectionImport::Error) do
      ActiveRecord::Base.transaction { import('[{"tags":["a"]}]', [ { key: "tags", data_type: "text" } ]) }
    end
    assert_match(/row 1, tags: nested/, error.message)
    assert_equal 0, @table.table_records.count
  end

  test "numbers and booleans in a text column are kept as text, and blanks are left empty" do
    import('[{"v":1},{"v":"a"},{"v":true},{"v":""},{"v":null}]', [ { key: "v", data_type: "text" } ])
    assert_equal [ "1", "a", "true", nil, nil ], values(@table).map { |row| row["v"] }
    assert_equal 5, @table.table_records.count
  end
end

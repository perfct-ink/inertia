require "test_helper"

class TableCsvImportTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "csv-import-ada@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @table = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @name = @table.table_fields.create!(name: "Name", data_type: "text")
    @age = @table.table_fields.create!(name: "Age", data_type: "integer")
  end

  def import(columns, rows)
    TableCsvImport.new(@table, columns: columns, rows: rows).run!
  end

  def values_of(record)
    record.table_cells.to_h { |cell| [ cell.table_field.name, cell.related_record_id || cell.value ] }
  end

  test "appends one record per row into existing fields" do
    count = import([ { field_id: @name.id }, { field_id: @age.id } ], [ [ "Ada", 36 ], [ "Bo", 0 ] ])
    assert_equal 2, count
    assert_equal [ { "Name" => "Ada", "Age" => 36 }, { "Name" => "Bo", "Age" => 0 } ], @table.table_records.order(:id).map { |r| values_of(r) }
  end

  test "creates new fields from named columns and leaves empty cells unset" do
    import([ { field_id: @name.id }, { name: "Active", data_type: "boolean" }, { name: "Born", data_type: "date" } ],
           [ [ "Ada", false, "1815-12-10" ], [ "Bo", "", "" ] ])
    assert_equal "boolean", @table.table_fields.find_by!(name: "Active").data_type
    first, second = @table.table_records.order(:id).to_a
    assert_equal({ "Name" => "Ada", "Active" => false, "Born" => "1815-12-10" }, values_of(first))
    assert_equal({ "Name" => "Bo" }, values_of(second))
  end

  test "reads a relation column as the id of a record in the linked collection" do
    target = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    company = target.table_records.create!
    field = @table.table_fields.create!(name: "Company", data_type: "relation", relation_table: target)
    import([ { field_id: @name.id }, { field_id: field.id } ], [ [ "Ada", company.id ] ])
    assert_equal company.id, @table.table_records.last.table_cells.find_by!(table_field: field).related_record_id
    error = assert_raises(TableCsvImport::Error) { import([ { field_id: field.id } ], [ [ company.id + 1000 ] ]) }
    assert_match(/Row 2, Company: there is no record/, error.message)
    assert_raises(TableCsvImport::Error) { import([ { field_id: field.id } ], [ [ "Acme" ] ]) }
  end

  test "a bad value names its row and field and undoes the whole import" do
    assert_no_difference([ "TableRecord.count", "TableCell.count", "TableField.count" ]) do
      error = assert_raises(TableCsvImport::Error) do
        ActiveRecord::Base.transaction do
          import([ { field_id: @name.id }, { name: "City", data_type: "text" }, { field_id: @age.id } ],
                 [ [ "Ada", "Paris", 36 ], [ "Bo", "Rome", "old" ] ])
        end
      end
      assert_match(/\ARow 3, Age: /, error.message)
    end
  end

  test "rejects a malformed import before changing anything" do
    assert_no_difference("TableRecord.count") do
      [
        [ [], [ [ "x" ] ], /at least one column/ ],
        [ [ { field_id: @name.id } ], [], /no records/ ],
        [ [ { field_id: @name.id } ], [ [ "a", "b" ] ], /Row 2 does not have a value for each/ ],
        [ [ { field_id: @name.id } ], [ "not a row" ], /Row 2 does not have/ ],
        [ [ { field_id: 0 } ], [ [ "x" ] ], /not in this collection/ ],
        [ [ { field_id: @name.id }, { field_id: @name.id } ], [ [ "a", "b" ] ], /More than one column/ ],
        [ [ "bad" ], [ [ "x" ] ], /Column 1 is not valid/ ],
        [ [ { name: " ", data_type: "text" } ], [ [ "x" ] ], /needs a name/ ],
        [ [ { name: "Name", data_type: "text" } ], [ [ "x" ] ], /Field Name: .*taken/ ],
        [ [ { name: "Odd", data_type: "mystery" } ], [ [ "x" ] ], /Column 1 cannot make a mystery field/ ],
        [ [ { name: "Odd", data_type: "relation" } ], [ [ "x" ] ], /Column 1 cannot make a relation field/ ],
        [ [ { name: "Odd", data_type: "formula" } ], [ [ "x" ] ], /Column 1 cannot make a formula field/ ],
        [ [ { name: "Odd" } ], [ [ "x" ] ], /Column 1 cannot make a blank field/ ]
      ].each do |columns, rows, pattern|
        error = assert_raises(TableCsvImport::Error, "expected #{columns.inspect} to be rejected") { ActiveRecord::Base.transaction { import(columns, rows) } }
        assert_match pattern, error.message
      end
    end
  end

  test "fields of another collection cannot be imported into" do
    other = @folder.documents.create!(title: "Other", doc_type: :table, created_by: @user)
    foreign = other.table_fields.create!(name: "Foreign", data_type: "text")
    assert_raises(TableCsvImport::Error) { import([ { field_id: foreign.id } ], [ [ "x" ] ]) }
  end

  test "a formula field is calculated, so nothing can be imported into it" do
    total = @table.table_fields.create!(name: "Double", data_type: "formula", formula: "{Age} * 2")
    error = assert_raises(TableCsvImport::Error) { import([ { field_id: total.id } ], [ [ 4 ] ]) }
    assert_match(/Double is calculated from its formula/, error.message)
    assert_equal 0, @table.table_records.count
  end

  test "limits the rows and cells of one import" do
    rows = Array.new(TableCsvImport::MAX_ROWS + 1) { [ "x" ] }
    assert_match(/At most #{TableCsvImport::MAX_ROWS} records/, assert_raises(TableCsvImport::Error) { import([ { field_id: @name.id } ], rows) }.message)
    columns = Array.new(TableCsvImport::MAX_CELLS / TableCsvImport::MAX_ROWS + 1) { |i| { name: "c#{i}", data_type: "text" } }
    wide = Array.new(TableCsvImport::MAX_ROWS) { Array.new(columns.size, "x") }
    assert_match(/At most #{TableCsvImport::MAX_CELLS} cells/, assert_raises(TableCsvImport::Error) { import(columns, wide) }.message)
    assert_equal 0, @table.table_records.count
  end
end

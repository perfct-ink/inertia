require "test_helper"

# Collection field types beyond text and numbers: formats, choices, people,
# auto-numbers and created/updated times. The per-type rules themselves are in
# field_type_test.rb; this checks how fields and cells use them.
class TableFieldTypesTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "field-types-ada@example.com", password: "password123")
    @space = Workspace.create!(name: "Team", user: @user)
    @folder = @space.folders.create!(name: "Tables")
    @table = @folder.documents.create!(title: "People", doc_type: :table, created_by: @user)
  end

  def add_field(type, name: type.humanize, **attributes)
    @table.table_fields.create!(name: name, data_type: type, **attributes)
  end

  def write(record, field, value)
    cell = record.table_cells.find_or_initialize_by(table_field: field)
    cell.value = value
    cell
  end

  test "values are stored plain whatever way they were typed" do
    record = @table.table_records.create!
    {
      "money" => [ "$1,250.00", 1250 ], "phone" => [ "(555) 123-4567", "5551234567" ], "percent" => [ "45%", 45 ],
      "month" => [ "March", 3 ], "color" => [ "0D9488", "#0d9488" ], "email" => [ "  ada@example.com ", "ada@example.com" ],
      "mileage" => [ "42,000 mi", 42_000 ], "rating" => [ "4", 4 ], "year" => [ "2026", 2026 ]
    }.each do |type, (typed, plain)|
      cell = write(record, add_field(type), typed)
      assert cell.save, "#{type}: #{cell.errors.full_messages.join(', ')}"
      assert_equal plain, cell.reload.value, type
    end
  end

  test "values that do not fit their type are rejected" do
    record = @table.table_records.create!
    { "email" => "ada@", "phone" => "abc", "url" => "example.com", "money" => 12.345, "percent" => 101, "rating" => 6,
      "month" => 13, "year" => 26, "color" => "teal", "username" => "a b", "long_text" => 5 }.each do |type, invalid|
      cell = write(record, add_field(type), invalid)
      assert_not cell.save, "#{type} accepted #{invalid.inspect}"
    end
  end

  test "a format must be one of the type's, and a type change starts from the default" do
    assert add_field("money", display_format: "eur").display_format == "eur"
    assert_not @table.table_fields.build(name: "Bad", data_type: "money", display_format: "dashes").valid?
    assert_not @table.table_fields.build(name: "Note", data_type: "text", display_format: "usd").valid?
    assert_nil add_field("phone", name: "Blank format", display_format: "").display_format
    money = add_field("money", name: "Price", display_format: "gbp")
    assert money.update(data_type: "phone")
    assert_nil money.reload.display_format
    assert money.update(data_type: "mileage", display_format: "kilometers")
    assert_equal "kilometers", money.reload.display_format
  end

  test "a format changes the display only, so it can change while the field has values" do
    field = add_field("money", display_format: "usd")
    record = @table.table_records.create!
    assert write(record, field, 1250).save
    assert field.update(display_format: "eur")
    assert_equal 1250, record.table_cells.first.value
    assert_equal({ field.id.to_s => "€1,250.00" }, record.reload.as_table_json([ field ])[:display])
  end

  test "single and multi select list their choices and hold only those" do
    single = add_field("single_select", name: "Stage", options: [ " Open ", "Done", "open" ])
    assert_equal %w[Open Done], single.options
    multi = add_field("multi_select", name: "Labels", options: %w[Bug Feature])
    record = @table.table_records.create!
    assert write(record, single, "Done").save
    assert_not write(record, single, "Nope").save
    assert write(record, multi, "Bug, Feature").save
    assert_equal %w[Bug Feature], record.table_cells.find_by(table_field: multi).value
    assert_not write(record, multi, %w[Bug Nope]).save
    assert write(record, multi, %w[Bug Bug]).save
    assert_equal %w[Bug], record.table_cells.find_by(table_field: multi).reload.value
  end

  test "a select needs between one and thirty short choices, and other fields keep none" do
    assert_not @table.table_fields.build(name: "Empty", data_type: "single_select", options: []).valid?
    assert_not @table.table_fields.build(name: "None", data_type: "multi_select").valid?
    assert_not @table.table_fields.build(name: "Long", data_type: "single_select", options: [ "x" * 41 ]).valid?
    assert_not @table.table_fields.build(name: "Many", data_type: "single_select", options: (1..31).map(&:to_s)).valid?
    assert_not @table.table_fields.build(name: "Text", data_type: "single_select", options: [ 1, 2 ]).valid?
    assert_nil add_field("text", name: "Plain", options: %w[Ignored]).options
  end

  test "taking a choice off the list clears it from the records that used it" do
    stage = add_field("single_select", name: "Stage", options: %w[Open Done])
    labels = add_field("multi_select", name: "Labels", options: %w[Bug Feature Docs])
    first = @table.table_records.create!
    second = @table.table_records.create!
    write(first, stage, "Done").save!
    write(second, stage, "Open").save!
    write(first, labels, %w[Bug Docs]).save!
    write(second, labels, %w[Docs]).save!
    assert stage.update(options: %w[Open])
    assert labels.update(options: %w[Bug Feature])
    assert_nil first.table_cells.find_by(table_field: stage)
    assert_equal "Open", second.table_cells.find_by(table_field: stage).value
    assert_equal %w[Bug], first.table_cells.find_by(table_field: labels).value
    assert_nil second.table_cells.find_by(table_field: labels)
  end

  test "a person must be able to open the Space" do
    member = User.create!(name: "Grace", email: "field-types-grace@example.com", password: "password123")
    stranger = User.create!(name: "Alan", email: "field-types-alan@example.com", password: "password123")
    @space.memberships.create!(user: member, role: :member)
    field = add_field("person", name: "Owner")
    record = @table.table_records.create!
    assert write(record, field, member.id).save
    assert_not write(record, field, stranger.id).save
    assert_not write(record, field, "Grace").save
  end

  test "an auto-number field numbers the records that exist, then each new one, and never reuses a number" do
    first = @table.table_records.create!
    second = @table.table_records.create!
    field = add_field("auto_number", name: "No.")
    assert_equal [ 1, 2 ], [ first, second ].map { |record| record.table_cells.find_by!(table_field: field).value }
    third = @table.table_records.create!
    assert_equal 3, third.table_cells.find_by!(table_field: field).value
    third.destroy!
    fourth = @table.table_records.create!
    assert_equal 4, fourth.table_cells.find_by!(table_field: field).value
    assert_equal 5, field.reload.next_number
  end

  test "an auto-number field cannot become another type, but another type can become one" do
    field = add_field("auto_number", name: "No.")
    assert_not field.update(data_type: "integer")
    assert_includes field.errors[:data_type], "cannot change for an auto-number field"
    text = add_field("text", name: "Code")
    record = @table.table_records.create!
    assert text.update(data_type: "auto_number")
    assert_equal 1, record.table_cells.find_by!(table_field: text).value
  end

  test "created and updated time fields are read from the record and hold no cells" do
    created = add_field("created_time", name: "Created", display_format: "date")
    updated = add_field("updated_time", name: "Updated")
    assert created.derived? && created.read_only?
    record = @table.table_records.create!
    assert_not write(record, created, "2026-11-07T10:00:00Z").valid?
    json = record.as_table_json([ created, updated ])
    assert_equal record.created_at.utc.iso8601, json[:values][created.id.to_s]
    assert_equal record.updated_at.utc.iso8601, json[:values][updated.id.to_s]
    assert_equal record.created_at.utc.iso8601[0, 10], json[:display][created.id.to_s]
    assert_equal record.updated_at.utc.strftime("%Y-%m-%d %H:%M"), json[:display][updated.id.to_s]
  end

  test "only the types in FieldType can be a field's type" do
    assert_not @table.table_fields.build(name: "Card", data_type: "credit_card").valid?
    assert_not @table.table_fields.build(name: "Secret", data_type: "password").valid?
    assert_equal FieldType::ALL.sort, (TableField::DATA_TYPES + TableField::DERIVED_TYPES + TableField::COMPUTED_TYPES + FieldType::MIRRORED).sort
  end
end

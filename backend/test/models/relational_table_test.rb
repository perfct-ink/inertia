require "test_helper"

class RelationalTableTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "table-ada@example.com", password: "password123")
    @folder = @user.workspace.folders.create!(name: "Tables")
    @table = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    @record = @table.table_records.create!
  end

  test "all scalar types enforce values and preserve false and zero" do
    examples = {
      "text" => [ "Ada", 3 ], "integer" => [ 0, 1.5 ], "number" => [ 1.5, "1.5" ],
      "boolean" => [ false, "false" ], "date" => [ "2026-10-04", "2026-02-30" ],
      "datetime" => [ "2026-10-04T10:30:00Z", "yesterday" ]
    }
    examples.each do |type, (valid, invalid)|
      field = @table.table_fields.create!(name: type, data_type: type)
      cell = @record.table_cells.build(table_field: field, value: valid)
      assert cell.save, cell.errors.full_messages.join(", ")
      assert_equal valid, cell.reload.value
      assert_not cell.update(value: invalid), "accepted #{invalid.inspect} as #{type}"
    end
  end

  test "relations belong to the target table and prevent deleting referenced records" do
    target = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    company = target.table_records.create!
    field = @table.table_fields.create!(name: "Company", data_type: "relation", relation_table: target)
    cell = @record.table_cells.create!(table_field: field, related_record: company)
    assert_not company.destroy
    assert_not target.destroy
    assert_not cell.update(related_record: @record)
    cell.destroy!
    assert company.reload.destroy
  end

  test "relation targets cannot cross workspace boundaries or point to documents" do
    other = User.create!(name: "Other", email: "other-table@example.com", password: "password123")
    foreign_folder = other.workspace.folders.create!(name: "Foreign")
    foreign_table = foreign_folder.documents.create!(title: "Foreign", doc_type: :table, created_by: other)
    field = @table.table_fields.build(name: "Foreign", data_type: "relation", relation_table: foreign_table)
    assert_not field.valid?
    field.relation_table = @folder.documents.create!(title: "Document", created_by: @user)
    assert_not field.valid?
  end

  test "schema edits reject incompatible changes until values are cleared" do
    field = @table.table_fields.create!(name: "Name", data_type: "text")
    @record.table_cells.create!(table_field: field, value: "Ada")
    assert_not field.update(data_type: "integer")
    field.reload
    assert field.update(name: "Full name")
    field.table_cells.destroy_all
    assert field.update(data_type: "integer")
  end

  test "cells cannot use a field from another table" do
    other = @folder.documents.create!(title: "Other", doc_type: :table, created_by: @user)
    field = other.table_fields.create!(name: "Name", data_type: "text")
    assert_not @record.table_cells.build(table_field: field, value: "Ada").valid?
  end

  test "formula fields need an expression and keep no values" do
    field = @table.table_fields.build(name: "Total", data_type: "formula")
    assert_not field.valid?
    assert_includes field.errors[:formula], "can't be blank"
    field.formula = "{Price} * {Quantity}"
    assert field.save, field.errors.full_messages.join(", ")
    assert field.computed?
    assert_not @record.table_cells.build(table_field: field, value: 10).valid?
    field.formula = "x" * (TableField::MAX_FORMULA_LENGTH + 1)
    assert_not field.valid?
  end

  test "only formula fields keep a formula" do
    field = @table.table_fields.create!(name: "Total", data_type: "formula", formula: "1 + 1")
    assert field.update(data_type: "text")
    assert_nil field.reload.formula
    text = @table.table_fields.create!(name: "Note", data_type: "text", formula: "ignored")
    assert_nil text.formula
  end

  test "a formula cannot refer to its own field" do
    field = @table.table_fields.build(name: "Total", data_type: "formula", formula: "{Total} + 1")
    assert_not field.valid?
    assert_includes field.errors[:formula], "cannot refer to its own field"
  end

  test "renaming a field rewrites the formulas that use it" do
    price = @table.table_fields.create!(name: "Price", data_type: "number")
    total = @table.table_fields.create!(name: "Total", data_type: "formula", formula: "{Price} * 2 + {Price Tax}")
    unrelated = @table.table_fields.create!(name: "Other", data_type: "formula", formula: "1 + 1")
    other_table = @folder.documents.create!(title: "Other", doc_type: :table, created_by: @user)
    elsewhere = other_table.table_fields.create!(name: "Elsewhere", data_type: "formula", formula: "{Price}")
    assert price.update(name: "Unit $1 price")
    assert_equal "{Unit $1 price} * 2 + {Price Tax}", total.reload.formula
    assert_equal "1 + 1", unrelated.reload.formula
    assert_equal "{Price}", elsewhere.reload.formula
  end

  def file_item(title = "mock.png", folder = @folder, user = @user)
    document = Document.new(title: title, doc_type: :file, folder: folder, created_by: user)
    document.file.attach(io: StringIO.new("png"), filename: title, content_type: "image/png")
    document.save!
    document
  end

  test "file and files fields hold uploaded file items from the same space" do
    cover = file_item
    shots = [ file_item("a.png"), file_item("b.png") ]
    single = @table.table_fields.create!(name: "Cover", data_type: "file")
    many = @table.table_fields.create!(name: "Screenshots", data_type: "files")

    assert @record.table_cells.build(table_field: single, value: cover.id).save
    assert @record.table_cells.build(table_field: many, value: shots.map(&:id)).save

    other = User.create!(name: "O", email: "table-files-other@example.com", password: "password123")
    foreign = file_item("x.png", other.workspace.folders.create!(name: "X"), other)
    plain = Document.create!(title: "Plain", folder: @folder, created_by: @user)
    record2 = @table.table_records.create!
    [ [ single, foreign.id ], [ single, plain.id ], [ single, "7" ], [ many, [ foreign.id ] ], [ many, shots.map(&:id) * 2 ], [ many, "no" ] ].each do |field, bad|
      assert_not record2.table_cells.build(table_field: field, value: bad).valid?, "accepted #{bad.inspect} for #{field.name}"
    end
  end

  test "deleting a file removes it from file fields" do
    keep = file_item("keep.png")
    drop = file_item("drop.png")
    single = @table.table_fields.create!(name: "Cover", data_type: "file")
    many = @table.table_fields.create!(name: "Shots", data_type: "files")
    one_cell = @record.table_cells.create!(table_field: single, value: drop.id)
    many_cell = @record.table_cells.create!(table_field: many, value: [ keep.id, drop.id ])

    drop.destroy

    assert_not TableCell.exists?(one_cell.id)
    assert_equal [ keep.id ], many_cell.reload.value
  end
end

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
      "text" => ["Ada", 3], "integer" => [0, 1.5], "number" => [1.5, "1.5"],
      "boolean" => [false, "false"], "date" => ["2026-10-04", "2026-02-30"],
      "datetime" => ["2026-10-04T10:30:00Z", "yesterday"]
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
end

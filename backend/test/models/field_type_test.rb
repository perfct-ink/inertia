require "test_helper"

class FieldTypeTest < ActiveSupport::TestCase
  EXAMPLES = {
    "long_text" => [ "line one\nline two", 5 ],
    "email" => [ "ada@example.com", "ada@" ],
    "phone" => [ "+1 (555) 123-4567", "abc" ],
    "url" => [ "https://example.com/a?b=1", "example.com" ],
    "username" => [ "ada_l", "a b" ],
    "person_name" => [ "Ada O'Neil-Smith", "R2D2" ],
    "alphanumeric" => [ "AB12cd", "AB-12" ],
    "vin" => [ "1HGCM82633A004352", "1HGCM82633A00435I" ],
    "color" => [ "#0d9488", "teal" ],
    "money" => [ 12.5, "12.5" ],
    "mileage" => [ 42_000, -1 ],
    "percent" => [ 99.5, 101 ],
    "rating" => [ 4, 6 ],
    "month" => [ 12, 13 ],
    "year" => [ 2026, 26 ],
    "location" => [ "221B Baker Street, London", "  " ],
    "country" => [ "US", "XX" ],
    "timezone" => [ "America/New_York", "Mars/Olympus" ]
  }.freeze

  test "every type accepts a valid value and rejects an invalid one" do
    assert_equal EXAMPLES.keys.sort, FieldType::TYPES.sort
    EXAMPLES.each do |type, (valid, invalid)|
      assert FieldType.valid?(type, valid), "#{type} rejected #{valid.inspect}"
      assert_not FieldType.valid?(type, invalid), "#{type} accepted #{invalid.inspect}"
    end
  end

  test "cells of the new types are validated and saved" do
    user = User.create!(name: "Ada", email: "ft-ada@example.com", password: "password123")
    table = user.workspace.folders.create!(name: "T").documents.create!(title: "People", doc_type: :table, created_by: user)
    record = table.table_records.create!
    field = table.table_fields.create!(name: "Email", data_type: "email")
    assert record.table_cells.build(table_field: field, value: "ada@example.com").save
    cell = record.table_cells.build(table_field: table.table_fields.create!(name: "Rating", data_type: "rating"), value: 9)
    assert_not cell.save
  end
end

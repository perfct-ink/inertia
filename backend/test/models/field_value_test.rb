require "test_helper"

# The same cases run against frontend/src/data/fieldValue.ts (fieldValue.test.ts),
# so the Ruby and TypeScript rules cannot drift apart.
class FieldValueTest < ActiveSupport::TestCase
  VECTORS = JSON.parse(File.read(Rails.root.join("..", "frontend", "src", "data", "fieldValue.vectors.json")))

  test "every scalar type has vectors, and every vector is for a scalar type" do
    assert_equal FieldValue::TYPES.sort, VECTORS.fetch("valid").keys.sort
  end

  test "each type accepts its valid values and rejects the rest" do
    VECTORS.fetch("valid").each do |type, cases|
      cases.fetch("ok").each { |value| assert FieldValue.valid?(type, value), "#{type} rejected #{value.inspect}" }
      cases.fetch("bad").each { |value| assert_not FieldValue.valid?(type, value), "#{type} accepted #{value.inspect}" }
    end
  end

  test "types with formats list them, the first being the default" do
    VECTORS.fetch("formats").each { |type, formats| assert_equal formats, FieldValue.formats(type), type }
    assert_equal "plain", FieldValue.default_format("number")
    assert_equal "commas", FieldValue.format_for("integer", "commas")
    assert_equal "plain", FieldValue.format_for("integer", "roman")
    assert_nil FieldValue.format_for("date", "commas")
  end

  test "an unknown type is never valid" do
    assert_not FieldValue.valid?("email", "ada@example.com")
  end
end

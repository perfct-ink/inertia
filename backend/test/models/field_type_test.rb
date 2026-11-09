require "test_helper"

# The same cases run against frontend/src/data/fieldType.ts (fieldType.test.ts),
# so the Ruby and TypeScript rules cannot drift apart.
class FieldTypeTest < ActiveSupport::TestCase
  VECTORS = JSON.parse(File.read(Rails.root.join("..", "frontend", "src", "data", "fieldType.vectors.json")))
  OPTIONS = VECTORS.fetch("options")

  test "every stored type has vectors, and every vector is for a stored type" do
    assert_equal (FieldType::VALUE + FieldType::AUTOMATIC).sort, VECTORS.fetch("valid").keys.sort
  end

  test "each type accepts its valid values and rejects the rest" do
    VECTORS.fetch("valid").each do |type, cases|
      cases.fetch("ok").each { |value| assert FieldType.valid?(type, value, options: OPTIONS), "#{type} rejected #{value.inspect}" }
      cases.fetch("bad").each { |value| assert_not FieldType.valid?(type, value, options: OPTIONS), "#{type} accepted #{value.inspect}" }
    end
  end

  test "typed or imported text is read into the plain value" do
    VECTORS.fetch("normalize").each do |type, input, expected|
      assert_equal expected, FieldType.normalize(type, input), "#{type} #{input.inspect}"
    end
  end

  test "values are shown in their format" do
    VECTORS.fetch("display").each do |type, format, value, text|
      shown = FieldType.display(type, format, value)
      text.nil? ? assert_nil(shown, "#{type} #{value.inspect}") : assert_equal(text, shown, "#{type} #{format.inspect} #{value.inspect}")
    end
  end

  test "plain values are stable: reading one again changes nothing" do
    VECTORS.fetch("valid").each do |type, cases|
      cases.fetch("ok").each { |value| assert_equal value, FieldType.normalize(type, value), "#{type} #{value.inspect}" }
    end
  end

  test "types with formats list them, the first being the default" do
    assert_equal %w[usd eur gbp jpy], FieldType.formats("money")
    assert_equal "usd", FieldType.default_format("money")
    assert_equal "eur", FieldType.format_for("money", "eur")
    assert_equal "usd", FieldType.format_for("money", "bitcoin")
    assert_empty FieldType.formats("email")
    FieldType::FORMATS.each_key { |type| assert_includes FieldType::ALL, type }
  end

  test "credit card, CVV, password and VIN are not field types" do
    %w[credit_card cvv password vin].each { |type| assert_not_includes FieldType::ALL, type }
  end

  test "the type lists do not overlap" do
    lists = [ FieldType::VALUE, FieldType::LINKED, FieldType::AUTOMATIC, FieldType::DERIVED, FieldType::COMPUTED ]
    assert_equal lists.sum(&:size), lists.flatten.uniq.size
  end
end

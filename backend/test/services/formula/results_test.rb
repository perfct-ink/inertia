require "test_helper"
require "bigdecimal"
require "minitest/mock"

# What only the server has to get right on top of the shared cases in
# vectors_test.rb: values as the database gives them, JSON-friendly results, and
# a formula that cannot take the Collection down with it.
class FormulaResultsTest < ActiveSupport::TestCase
  Field = Struct.new(:id, :name, :data_type, :formula)
  NOW = Time.utc(2026, 11, 3, 23, 59, 59)

  def number(id, name) = Field.new(id, name, "number", nil)
  def formula(id, name, source) = Field.new(id, name, "formula", source)

  def results(fields, values = {})
    Formula::Results.new(fields, now: NOW).for_record(values)
  end

  test "results are keyed by field id as text and whole numbers are integers" do
    out = results([ number(1, "Price"), formula(2, "Double", "{Price} * 2"), formula(3, "Half", "{Price} / 2") ], "1" => 5)
    assert_equal({ "2" => { value: 10 }, "3" => { value: 2.5 } }, out)
    assert_instance_of Integer, out["2"][:value]
    assert_instance_of Float, out["3"][:value]
  end

  test "a table with no formula fields has no results" do
    assert_equal({}, results([ number(1, "Price") ], "1" => 5))
  end

  test "values of any number type are read as numbers" do
    fields = [ number(1, "Price"), formula(2, "Total", "{Price} / 4") ]
    assert_equal 2.5, results(fields, "1" => 10)["2"][:value]
    assert_equal 2.5, results(fields, "1" => 10.0)["2"][:value]
    assert_equal 2.5, results(fields, "1" => BigDecimal("10"))["2"][:value]
    assert_equal 2.5, results(fields, "1" => "10")["2"][:value]
  end

  test "a list of files counts as blank" do
    fields = [ Field.new(1, "Images", "files", nil), formula(2, "Empty", "ISBLANK({Images})"), formula(3, "Sum", "SUM({Images}, 1)") ]
    assert_equal({ "2" => { value: true }, "3" => { value: 1 } }, results(fields, "1" => [ 3, 4 ]))
  end

  test "an integer too big for a float is a number too large rather than a crash" do
    fields = [ Field.new(1, "Big", "integer", nil), formula(2, "Plus", "{Big} + 1") ]
    assert_equal({ "2" => { error: "#NUM!", message: "The result is not a finite number" } }, results(fields, "1" => 10**400))
  end

  test "TODAY is the date in UTC of the time given" do
    assert_equal "2026-11-03", results([ formula(1, "Today", "TODAY()") ])["1"][:value]
  end

  test "each formula is parsed once however many records there are" do
    field = formula(1, "Total", "1 + 1")
    calls = 0
    original = Formula::Parser.method(:parse)
    Formula::Parser.stub(:parse, ->(source) { calls += 1; original.call(source) }) do
      all = Formula::Results.new([ field ], now: NOW)
      3.times { all.for_record({}) }
    end
    assert_equal 1, calls
  end

  test "text is limited to the size of a spreadsheet cell, counted in UTF-16 units" do
    text = Field.new(1, "T", "text", nil)
    half = "a" * 16_383
    out = results([ text, formula(2, "Fits", 'LEN({T} & {T} & "a")'), formula(3, "Over", '{T} & {T} & "ab"'), formula(4, "Concat", 'CONCAT({T}, {T}, "ab")') ], "1" => half)
    assert_equal({ value: 32_767 }, out["2"])
    assert_equal({ error: "#VALUE!", message: "The text is longer than 32767 characters" }, out["3"])
    assert_equal "#VALUE!", out["4"][:error]
    # 16,384 characters, but 32,768 UTF-16 units.
    assert_equal "#VALUE!", results([ text, formula(2, "Both", "{T} & {T}") ], "1" => "😀" * 8192)["2"][:error]
    assert_equal({ value: 32_764 }, results([ text, formula(2, "Both", "LEN({T} & {T})") ], "1" => "😀" * 8191)["2"])
  end

  test "a chain of formulas that each double a text stops at the limit instead of filling memory" do
    chain = (1..40).map { |i| formula(i + 1, "F#{i}", i == 1 ? "{T} & {T}" : "{F#{i - 1}} & {F#{i - 1}}") }
    out = results([ Field.new(1, "T", "text", nil) ] + chain, "1" => "ab")
    assert_equal 16_384, out["14"][:value].length
    assert_equal "#VALUE!", out["15"][:error]
    assert_equal "#VALUE!", out["41"][:error]
  end

  test "a formula that fails in an unexpected way gives an error for that field only" do
    broken = Field.new(1, "Broken", "formula", nil)
    broken.define_singleton_method(:formula) { raise "boom" }
    out = results([ broken, number(2, "Price"), formula(3, "Fine", "{Price} + 1") ], "2" => 1)
    assert_equal({ error: "#ERROR!", message: "The formula could not be worked out" }, out["1"])
    assert_equal({ value: 2 }, out["3"])
  end

  test "a formula nested too deeply for its own good is an error, not a crash" do
    deep = "(" * 5000 + "1" + ")" * 5000
    out = results([ formula(1, "Deep", deep) ])
    assert_includes [ { value: 1 }, { error: "#ERROR!", message: "The formula could not be worked out" } ], out["1"]
  end

  test "a formula the model accepts, at its longest, is worked out" do
    source = ([ "1" ] * 499).join("+")
    assert_operator source.length, :<=, TableField::MAX_FORMULA_LENGTH
    assert_equal({ "1" => { value: 499 } }, results([ formula(1, "Long", source) ]))
  end

  test "output values keep fractions and non-whole numbers as floats" do
    assert_equal 3, Formula::Results.output_value(3.0)
    assert_equal 0.5, Formula::Results.output_value(0.5)
    assert_equal 1e20, Formula::Results.output_value(1e20)
    assert_equal "x", Formula::Results.output_value("x")
    assert_nil Formula::Results.output_value(nil)
    assert_equal true, Formula::Results.output_value(true)
  end
end

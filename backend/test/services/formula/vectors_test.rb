require "test_helper"
require "json"
require "time"

# Runs the cases in frontend/src/util/expression.vectors.json, which the web
# app's tests run too (frontend/src/util/expression.vectors.test.ts and
# frontend/src/data/formula.vectors.test.ts), so a formula gives the same result
# on the server as in the browser. Change the language in both places and add a
# case to that file.
class FormulaVectorsTest < ActiveSupport::TestCase
  VECTORS = JSON.parse(File.read(File.expand_path("../../../../frontend/src/util/expression.vectors.json", __dir__)))
  NOW = Time.iso8601(VECTORS.fetch("now"))
  Field = Struct.new(:id, :name, :data_type, :formula)

  def evaluate(item)
    fields = item["fields"] || {}
    evaluator = Formula::Evaluator.new(now: NOW) do |name|
      raise Formula::Error.new("#REF!", "There is no field named {#{name}}") unless fields.key?(name)
      Formula::Results.input_value(fields[name])
    end
    { "value" => evaluator.evaluate(Formula::Parser.parse(item["formula"])) }
  rescue Formula::Error => error
    { "error" => error.code, "message" => error.message }
  end

  VECTORS.fetch("evaluations").each do |group|
    test "evaluations: #{group['group']}" do
      group.fetch("cases").each do |item|
        expected = item.key?("error") ? item.slice("error", "message") : { "value" => item["value"] }
        assert_equal({ "formula" => item["formula"] }.merge(expected), { "formula" => item["formula"] }.merge(evaluate(item)))
      end
    end
  end

  test "the references each formula names" do
    VECTORS.fetch("references").each do |item|
      assert_equal item["references"], Formula::Parser.references(Formula::Parser.parse(item["formula"])), item["formula"]
    end
  end

  test "the function table has the names and argument counts the web app has" do
    table = Formula::Functions::TABLE.map do |name, spec|
      { "name" => name, "min" => spec.min, "max" => spec.max == Float::INFINITY ? nil : spec.max }
    end
    assert_equal VECTORS.fetch("functions"), table
  end

  VECTORS.fetch("records").each do |scenario|
    test "records: #{scenario['name']}" do
      fields = scenario["fields"].map { |field| Field.new(field["id"], field["name"], field["data_type"], field["formula"]) }
      results = Formula::Results.new(fields, now: NOW).for_record(scenario["values"])
      assert_equal scenario["results"], JSON.parse(JSON.generate(results))
    end
  end
end

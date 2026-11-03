module Formula
  # The saved result of every formula field of a Collection, record by record.
  # The same rules as `computeFormulas` in frontend/src/data/formula.ts:
  # formulas read the record's other fields by name (including other formulas),
  # a problem shows as an error for that field only, and a loop is #CIRC!.
  #
  # fields: anything with #id, #name, #data_type and #formula (TableField).
  # Each formula is parsed once, however many records there are.
  #
  #   results = Formula::Results.new(table.table_fields)
  #   results.for_record("5" => 2.5, "6" => 4)
  #   # => { "7" => { value: 10 }, "8" => { error: "#DIV/0!", message: "Cannot divide by zero" } }
  class Results
    FORMULA_TYPE = "formula"

    attr_reader :formulas, :now

    def initialize(fields, now: Time.now.utc)
      fields = fields.to_a
      @by_name = fields.to_h { |field| [ field.name, field ] }
      @formulas = fields.select { |field| formula?(field) }
      @now = now
      @parsed = {}
    end

    # values: the record's values by field id (as a String), as the Collection API sends them.
    # Answers each formula field's result by field id (as a String).
    def for_record(values)
      Calculation.new(self, values || {}).results
    end

    def formula?(field)
      field.data_type == FORMULA_TYPE
    end

    def field_named(name)
      @by_name[name]
    end

    # The parsed formula of a field, or the Formula::Error it fails with.
    def parsed(field)
      @parsed[field.id] ||= begin
        Parser.parse(field.formula.to_s)
      rescue Error => error
        error
      end
    end

    # A value from the database as a formula reads it. A list of files is no use in a formula, so it counts as blank.
    def self.input_value(value)
      case value
      when Array, Hash then nil
      when Numeric then value.to_f
      when true, false, String, nil then value
      else value.to_s
      end
    end

    # Whole numbers go out as integers, as JSON written by the browser would read them.
    def self.output_value(value)
      value.is_a?(Float) && value.finite? && value == value.round && value.abs < 1e15 ? value.to_i : value
    end

    # One record's results.
    class Calculation
      def initialize(owner, values)
        @owner = owner
        @values = values
        @results = {}
        @running = []
      end

      def results
        @owner.formulas.to_h do |field|
          result = compute(field)
          [ field.id.to_s, result.key?(:value) ? { value: Results.output_value(result[:value]) } : result ]
        end
      end

      private

      def value_of(field)
        return Results.input_value(@values[field.id.to_s]) unless @owner.formula?(field)
        result = compute(field)
        raise Error.new(result[:error], result[:message]) if result.key?(:error)
        result[:value]
      end

      def compute(field)
        return @results[field.id] if @results.key?(field.id)
        return { error: "#CIRC!", message: "{#{field.name}} depends on itself" } if @running.include?(field.id)
        @running.push(field.id)
        begin
          @results[field.id] = evaluate(field)
        ensure
          @running.delete(field.id)
        end
      end

      def evaluate(field)
        tree = @owner.parsed(field)
        raise tree if tree.is_a?(Error)
        resolve = lambda do |name|
          target = @owner.field_named(name)
          raise Error.new("#REF!", "There is no field named {#{name}}") unless target
          value_of(target)
        end
        { value: Evaluator.new(now: @owner.now, &resolve).evaluate(tree) }
      rescue Error => error
        { error: error.code, message: error.message }
      rescue StandardError, SystemStackError => error
        # A bug or a formula nested too deeply must not take the whole Collection down with it.
        Rails.logger&.error("Formula #{field.id} failed: #{error.class}: #{error.message}") if defined?(Rails) && Rails.respond_to?(:logger)
        { error: "#ERROR!", message: "The formula could not be worked out" }
      end
    end
  end
end

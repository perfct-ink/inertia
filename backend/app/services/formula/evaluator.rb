module Formula
  # Works out a parsed formula (see Parser) against the fields it refers to.
  # The same rules as `evaluateExpression` in frontend/src/util/expression.ts;
  # change both together.
  #
  # resolve is called with a field name and returns that field's value (a
  # Float, String, true, false or nil for blank); it raises Formula::Error
  # (#REF!) when there is no such field. now is the time TODAY() reads.
  class Evaluator
    V = Values

    def initialize(now: Time.now.utc, &resolve)
      @now = now
      @resolve = resolve
    end

    def evaluate(node)
      case node
      when Parser::Number, Parser::Text, Parser::Bool then node.value
      when Parser::Ref then @resolve.call(node.name)
      when Parser::Unary
        value = evaluate(node.arg)
        node.op == "-" ? 0.0 - V.to_number(value) : value
      when Parser::Binary then apply(node.op, evaluate(node.left), evaluate(node.right))
      when Parser::Call
        return evaluate_lazy(node) if Functions::LAZY.include?(node.name)
        Functions::TABLE.fetch(node.name).run.call(node.args.map { |arg| evaluate(arg) }, @now)
      end
    end

    private

    # Spreadsheet-style a ^ b: a negative number to a fractional power is #NUM!, not a complex number.
    def power(base, exponent)
      return Float::NAN if base.abs == 1 && exponent.infinite?
      return Float::NAN if base.negative? && exponent.finite? && exponent != exponent.round
      result = base**exponent
      result.is_a?(Complex) ? Float::NAN : result
    end

    def apply(op, left, right)
      case op
      when "+" then V.checked_number(V.to_number(left) + V.to_number(right))
      when "-" then V.checked_number(V.to_number(left) - V.to_number(right))
      when "*" then V.checked_number(V.to_number(left) * V.to_number(right))
      when "/"
        divisor = V.to_number(right)
        raise Error.new("#DIV/0!", "Cannot divide by zero") if divisor.zero?
        V.checked_number(V.to_number(left) / divisor)
      when "^" then V.checked_number(power(V.to_number(left), V.to_number(right)))
      when "&" then V.checked_text(V.format_value(left) + V.format_value(right))
      when "=" then V.compare(left, right) == 0
      when "<>" then V.compare(left, right) != 0
      when "<" then V.compare(left, right) < 0
      when "<=" then V.compare(left, right) <= 0
      when ">" then V.compare(left, right) > 0
      when ">=" then V.compare(left, right) >= 0
      end
    end

    # IF and IFERROR only work out the branch they need.
    def evaluate_lazy(node)
      first, second, third = node.args
      if node.name == "IFERROR"
        begin
          return evaluate(first)
        rescue Error
          return evaluate(second)
        end
      end
      return evaluate(second) if V.to_boolean(evaluate(first))
      third ? evaluate(third) : false
    end
  end
end

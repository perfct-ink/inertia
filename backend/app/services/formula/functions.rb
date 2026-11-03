module Formula
  # The functions a formula can call. The same names, argument counts and
  # results as FUNCTIONS in frontend/src/util/expression.ts; change both
  # together. IF and IFERROR only work out the branch they need, so the
  # Evaluator handles them (LAZY) and their run is not used.
  module Functions
    # max is Float::INFINITY when a function takes any number of values.
    # run is called with the values already worked out and the current time.
    Spec = Struct.new(:min, :max, :run)

    LAZY = %w[IF IFERROR].freeze
    V = Values

    # Blank values are skipped by the aggregates, anything else must be a number.
    NUMBERS_IN = ->(args) { args.compact.map { |arg| V.to_number(arg) } }

    # Added one by one, left to right, as the browser does (Array#sum is more exact and would differ in the last digit).
    SUM_OF = ->(numbers) { numbers.reduce(0.0) { |total, number| total + number } }

    # MIN or MAX of the numbers, or 0 when every value is blank.
    EXTREME = lambda do |args, pick|
      numbers = NUMBERS_IN.call(args)
      numbers.empty? ? 0.0 : numbers.public_send(pick)
    end

    # How many characters LEFT and RIGHT keep: the second value, or 1 when it is left out.
    COUNT_ARG = lambda do |args|
      count = args.size > 1 ? V.trunc(V.to_number(args[1])) : 1.0
      raise Error.new("#VALUE!", "The count cannot be negative") if count.negative?
      count
    end

    # Half away from zero, after the floating point noise is rounded away.
    ROUND_TO = lambda do |number, digits|
      factor = 10.0**digits
      scaled = V.clean_number(number.abs * factor)
      rounded = scaled.finite? ? scaled.round(half: :up).to_f : scaled
      V.sign(number) * rounded / factor
    end

    # Math.floor and Math.ceil, which leave 1e999 and the like alone.
    WHOLE = ->(number, method) { number.finite? ? number.public_send(method).to_f : number }

    TODAY = ->(now) { V.format_date(*V.civil_from_days(now.to_i.div(86_400))) }

    TABLE = {
      "IF" => Spec.new(2, 3, nil),
      "IFERROR" => Spec.new(2, 2, nil),
      "AND" => Spec.new(1, Float::INFINITY, ->(args, _now) { args.all? { |arg| V.to_boolean(arg) } }),
      "OR" => Spec.new(1, Float::INFINITY, ->(args, _now) { args.any? { |arg| V.to_boolean(arg) } }),
      "NOT" => Spec.new(1, 1, ->(args, _now) { !V.to_boolean(args[0]) }),
      "ISBLANK" => Spec.new(1, 1, ->(args, _now) { V.blank_value?(args[0]) }),
      "ABS" => Spec.new(1, 1, ->(args, _now) { V.to_number(args[0]).abs }),
      "ROUND" => Spec.new(1, 2, lambda { |args, _now|
        digits = args.size > 1 ? V.trunc(V.to_number(args[1])) : 0.0
        V.checked_number(ROUND_TO.call(V.to_number(args[0]), digits))
      }),
      "FLOOR" => Spec.new(1, 1, ->(args, _now) { WHOLE.call(V.to_number(args[0]), :floor) }),
      "CEILING" => Spec.new(1, 1, ->(args, _now) { WHOLE.call(V.to_number(args[0]), :ceil) }),
      "MOD" => Spec.new(2, 2, lambda { |args, _now|
        by = V.to_number(args[1])
        raise Error.new("#DIV/0!", "Cannot divide by zero") if by.zero?
        number = V.to_number(args[0])
        V.checked_number(number - by * WHOLE.call(number / by, :floor))
      }),
      "SQRT" => Spec.new(1, 1, lambda { |args, _now|
        number = V.to_number(args[0])
        raise Error.new("#NUM!", "Cannot take the square root of a negative number") if number.negative?
        V.checked_number(Math.sqrt(number))
      }),
      "SUM" => Spec.new(1, Float::INFINITY, ->(args, _now) { V.checked_number(SUM_OF.call(NUMBERS_IN.call(args))) }),
      "AVERAGE" => Spec.new(1, Float::INFINITY, lambda { |args, _now|
        numbers = NUMBERS_IN.call(args)
        raise Error.new("#DIV/0!", "There are no numbers to average") if numbers.empty?
        V.checked_number(SUM_OF.call(numbers) / numbers.size)
      }),
      "MIN" => Spec.new(1, Float::INFINITY, ->(args, _now) { EXTREME.call(args, :min) }),
      "MAX" => Spec.new(1, Float::INFINITY, ->(args, _now) { EXTREME.call(args, :max) }),
      "CONCAT" => Spec.new(1, Float::INFINITY, ->(args, _now) { args.map { |arg| V.format_value(arg) }.join }),
      "LEN" => Spec.new(1, 1, ->(args, _now) { V.utf16_length(V.format_value(args[0])).to_f }),
      "UPPER" => Spec.new(1, 1, ->(args, _now) { V.format_value(args[0]).upcase }),
      "LOWER" => Spec.new(1, 1, ->(args, _now) { V.js_downcase(V.format_value(args[0])) }),
      "TRIM" => Spec.new(1, 1, ->(args, _now) { V.js_trim(V.format_value(args[0])).gsub(/#{V::JS_SPACE}+/, " ") }),
      "LEFT" => Spec.new(1, 2, lambda { |args, _now|
        text = V.format_value(args[0])
        V.utf16_slice(text, 0, [ COUNT_ARG.call(args), V.utf16_length(text) ].min.to_i)
      }),
      "RIGHT" => Spec.new(1, 2, lambda { |args, _now|
        text = V.format_value(args[0])
        length = V.utf16_length(text)
        V.utf16_slice(text, [ length - [ COUNT_ARG.call(args), length ].min.to_i, 0 ].max, length)
      }),
      "TODAY" => Spec.new(0, 0, ->(_args, now) { TODAY.call(now) }),
      "DAYS" => Spec.new(2, 2, ->(args, _now) { (V.to_days(args[0]) - V.to_days(args[1])).to_f }),
      "DATEADD" => Spec.new(2, 2, lambda { |args, _now|
        day = V.to_days(args[0]) + V.trunc(V.to_number(args[1]))
        raise Error.new("#NUM!", "The date is out of range") if day < V::MIN_DAY || day > V::MAX_DAY
        V.format_date(*V.civil_from_days(day.to_i))
      }),
      "YEAR" => Spec.new(1, 1, ->(args, _now) { V.civil_from_days(V.to_days(args[0]))[0].to_f }),
      "MONTH" => Spec.new(1, 1, ->(args, _now) { V.civil_from_days(V.to_days(args[0]))[1].to_f }),
      "DAY" => Spec.new(1, 1, ->(args, _now) { V.civil_from_days(V.to_days(args[0]))[2].to_f })
    }.freeze

    NAMES = TABLE.keys.freeze
  end
end

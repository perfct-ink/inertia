module Formula
  # What a value is worth in a formula: a number, text, TRUE/FALSE or blank
  # (nil). Numbers are always Floats, as they are in the browser. Mirrors the
  # value helpers in frontend/src/util/expression.ts; change both together.
  # Plain Ruby with no Rails, so it runs anywhere.
  #
  # JavaScript counts text in UTF-16 units and trims its own set of spaces, so
  # the helpers here do too, to give the same answers as the web app.
  module Values
    # JavaScript's \s: the ASCII spaces plus no-break, the Unicode space separators, line and paragraph separators and the byte order mark.
    JS_SPACE = /[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/
    NUMERIC_TEXT = /\A#{JS_SPACE}*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?#{JS_SPACE}*\z/i
    CASED = /\p{Cased}/
    CASE_IGNORABLE = /\p{Case_Ignorable}/
    DATE_PREFIX = /\A(\d{4})-(\d{2})-(\d{2})/

    # The first and last day a date can be, as days since 1970-01-01.
    MIN_DAY = -719_528 # 0000-01-01
    MAX_DAY = 2_932_896 # 9999-12-31

    module_function

    # ----- Numbers

    # Floating point noise (0.1 + 0.2) is rounded away, as spreadsheets do.
    def clean_number(number)
      number = number.to_f
      number.finite? ? Float(format("%.15g", number)) : number
    end

    def checked_number(number)
      raise Error.new("#NUM!", "The result is not a finite number") unless number.finite?
      clean_number(number)
    end

    # Number("...") for text that already matched NUMERIC_TEXT (Ruby's Float() is stricter about "5." and ".5").
    def parse_number(text)
      sign, whole, fraction, exponent = /\A([-+]?)(\d*)\.?(\d*)(?:e([-+]?\d+))?\z/i.match(js_trim(text)).captures
      whole = "0" if whole.empty?
      fraction = "0" if fraction.empty?
      Float("#{sign}#{whole}.#{fraction}#{exponent ? "e#{exponent}" : ""}")
    end

    # Math.trunc: drop the fraction, leaving 1e999 and the like alone.
    def trunc(number)
      number.finite? ? number.truncate.to_f : number
    end

    def sign(number)
      number.nan? ? number : (number <=> 0)
    end

    # JavaScript's String(number): 1e21 is "1e+21", 0.0000001 is "1e-7", 1.0 is "1".
    def js_number(number)
      return "0" if number.zero?
      return (number.nan? ? "NaN" : (number.positive? ? "Infinity" : "-Infinity")) unless number.finite?
      whole, fraction, exponent = number.abs.to_s.match(/\A(\d+)\.?(\d*)(?:e([-+]?\d+))?\z/).captures
      digits = whole + fraction
      point = whole.length + exponent.to_i - digits[/\A0*/].length
      digits = digits.sub(/\A0+/, "").sub(/0+\z/, "")
      count = digits.length
      body =
        if count <= point && point <= 21
          digits + "0" * (point - count)
        elsif point.positive? && point <= 21
          "#{digits[0, point]}.#{digits[point..]}"
        elsif point <= 0 && point > -6
          "0." + "0" * -point + digits
        else
          mantissa = count == 1 ? digits : "#{digits[0]}.#{digits[1..]}"
          exponent_sign = point.positive? ? "+" : "-"
          "#{mantissa}e#{exponent_sign}#{(point - 1).abs}"
        end
      number.negative? ? "-#{body}" : body
    end

    # ----- Conversions

    def quoted(value)
      value.is_a?(String) ? "\"#{value}\"" : format_value(value)
    end

    # How a value reads in cells and when joined with &.
    def format_value(value)
      case value
      when nil then ""
      when true then "TRUE"
      when false then "FALSE"
      when Numeric then js_number(clean_number(value))
      else value
      end
    end

    def to_number(value)
      case value
      when nil then 0.0
      when Numeric then value.to_f
      when true then 1.0
      when false then 0.0
      else
        raise Error.new("#VALUE!", "#{quoted(value)} is not a number") unless NUMERIC_TEXT.match?(value)
        number = parse_number(value)
        raise Error.new("#NUM!", "#{quoted(value)} is too large to be a number") unless number.finite?
        number
      end
    end

    def to_boolean(value)
      case value
      when nil then false
      when true, false then value
      when Numeric then value != 0
      else
        upper = js_trim(value).upcase
        raise Error.new("#VALUE!", "#{quoted(value)} is not TRUE or FALSE") unless %w[TRUE FALSE].include?(upper)
        upper == "TRUE"
      end
    end

    def blank_value?(value)
      value.nil? || value == ""
    end

    # ----- Comparing

    # Numbers sort before text, text before booleans; text ignores case. A
    # blank takes the type of what it is compared with.
    def rank(value)
      value.is_a?(Numeric) ? 0 : (value.is_a?(String) ? 1 : 2)
    end

    def blank_like(value)
      value.is_a?(Numeric) ? 0.0 : (value.is_a?(String) ? "" : false)
    end

    def compare(left, right)
      return 0 if left.nil? && right.nil?
      a = left.nil? ? blank_like(right) : left
      b = right.nil? ? blank_like(left) : right
      return rank(a) - rank(b) if rank(a) != rank(b)
      if a.is_a?(Numeric)
        sign(clean_number(a) - clean_number(b))
      elsif a.is_a?(String)
        utf16(js_downcase(a)) <=> utf16(js_downcase(b))
      else
        (a ? 1 : 0) - (b ? 1 : 0)
      end
    end

    # ----- Text (UTF-16 units, trimming and spacing as in JavaScript)

    def utf16(text)
      text.encode("UTF-16BE")
    end

    def utf16_length(text)
      text.encode("UTF-16LE").bytesize / 2
    end

    # text.slice(from, to) in UTF-16 units; a cut through an emoji leaves the replacement character.
    def utf16_slice(text, from, to)
      units = text.encode("UTF-16LE").b
      units.byteslice(from * 2, (to - from) * 2).force_encoding("UTF-16LE").encode("UTF-8", invalid: :replace, undef: :replace)
    end

    # The UTF-16 offset of the character at index in text (JavaScript's position in the string).
    def utf16_offset(text, index)
      utf16_length(text[0, index])
    end

    # text.toLowerCase(): like downcase, but a capital sigma at the end of a word becomes the final sigma, ς.
    def js_downcase(text)
      return text.downcase unless text.include?("Σ")
      chars = text.chars
      chars.each_with_index.map do |char, index|
        next char.downcase unless char == "Σ"
        before = chars[0, index].reverse_each.find { |other| !CASE_IGNORABLE.match?(other) }
        after = chars[(index + 1)..].find { |other| !CASE_IGNORABLE.match?(other) }
        before && CASED.match?(before) && !(after && CASED.match?(after)) ? "ς" : "σ"
      end.join
    end

    def js_trim(text)
      text.gsub(/\A#{JS_SPACE}+|#{JS_SPACE}+\z/, "")
    end

    # ----- Dates: "YYYY-MM-DD" text in UTC, counted as days since 1970-01-01.

    # A longer date-time is cut to its date.
    def to_days(value)
      match = value.is_a?(String) && DATE_PREFIX.match(value)
      if match
        year, month, day = match.captures.map(&:to_i)
        if month.between?(1, 12) && day.between?(1, 31)
          days = days_from_civil(year, month, day)
          return days if civil_from_days(days) == [ year, month, day ]
        end
      end
      raise Error.new("#VALUE!", "#{quoted(value)} is not a date (use YYYY-MM-DD)")
    end

    def format_date(year, month, day)
      format("%04d-%02d-%02d", year, month, day)
    end

    # Days since 1970-01-01 in the proleptic Gregorian calendar (Howard Hinnant's algorithm).
    def days_from_civil(year, month, day)
      year -= 1 if month <= 2
      era = year.div(400)
      year_of_era = year - era * 400
      day_of_year = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1
      day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year
      era * 146_097 + day_of_era - 719_468
    end

    def civil_from_days(days)
      days += 719_468
      era = days.div(146_097)
      day_of_era = days - era * 146_097
      year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365
      day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100)
      shifted_month = (5 * day_of_year + 2) / 153
      day = day_of_year - (153 * shifted_month + 2) / 5 + 1
      month = shifted_month < 10 ? shifted_month + 3 : shifted_month - 9
      year = year_of_era + era * 400
      [ month <= 2 ? year + 1 : year, month, day ]
    end
  end
end

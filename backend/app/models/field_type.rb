require "date"

# What each Collection field type stores, accepts and shows, in one place so
# cells, the API and imports agree. The web app mirrors it in
# frontend/src/data/fieldType.ts; both are checked against the same test
# vectors (frontend/src/data/fieldType.vectors.json).
#
# A field has a type, and the type has formats (money: usd, eur, gbp, jpy). A
# value is always stored plain (money as a number, a phone as its digits) and
# the format only changes how it is shown. Most types have no choice of format;
# where there are several the first is the default and the field picks one.
#
# Where a type lives:
#   VALUE      a cell holds it and it is checked here
#   LINKED     a cell holds it, and TableCell also checks it against other
#              records (a relation, an uploaded file, a member of the Space)
#   AUTOMATIC  a cell holds a number the server assigns (auto_number)
#   DERIVED    never stored: read from the record (created_time, updated_time)
#   COMPUTED   worked out by the web app (formula)
#
# Left out on purpose (Alex, 2026-11-07): credit card, CVV, password and VIN. A
# Collection should not store card numbers or passwords.
module FieldType
  VALUE = %w[
    text long_text integer number boolean date datetime
    email phone url username person_name alphanumeric color
    money mileage percent rating month year single_select multi_select
  ].freeze
  LINKED = %w[relation file files person].freeze
  AUTOMATIC = %w[auto_number].freeze
  DERIVED = %w[created_time updated_time].freeze
  COMPUTED = %w[formula].freeze
  STORED = (VALUE + LINKED + AUTOMATIC).freeze
  ALL = (STORED + DERIVED + COMPUTED).freeze

  # Types whose choices live on the field (`options`).
  CHOICE_TYPES = %w[single_select multi_select].freeze

  FORMATS = {
    "integer" => %w[plain commas],
    "number" => %w[plain commas],
    "money" => %w[usd eur gbp jpy],
    "mileage" => %w[miles kilometers],
    "phone" => %w[parentheses dashes],
    "rating" => %w[stars number],
    "month" => %w[name short number],
    "auto_number" => %w[plain padded],
    "created_time" => %w[date_time date],
    "updated_time" => %w[date_time date]
  }.freeze

  MAX_SHORT_TEXT = 255
  MAX_LONG_TEXT = 20_000
  MAX_NUMBER = 1_000_000_000_000
  RATING_RANGE = 1..5
  MONTH_NAMES = %w[January February March April May June July August September October November December].freeze
  CURRENCIES = {
    "usd" => { symbol: "$", decimals: 2 },
    "eur" => { symbol: "€", decimals: 2 },
    "gbp" => { symbol: "£", decimals: 2 },
    "jpy" => { symbol: "¥", decimals: 0 }
  }.freeze

  EMAIL = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
  PHONE = /\A\+?\d{7,15}\z/
  PHONE_TEXT = /\A\+?[\d\s().-]+\z/
  URL = %r{\Ahttps?://[^\s]+\z}
  USERNAME = /\A[A-Za-z0-9_.-]{3,30}\z/
  PERSON_NAME = /\A[[:alpha:]][[:alpha:]\s'.-]*\z/
  ALPHANUMERIC = /\A[A-Za-z0-9]+\z/
  COLOR = /\A#[0-9a-f]{6}\z/
  NUMBER_TEXT = /\A[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?\z/

  module_function

  def formats(type) = FORMATS.fetch(type, [])

  def default_format(type) = formats(type).first

  # The format a field shows: its own when it is one of the type's, else the default.
  def format_for(type, format) = formats(type).include?(format) ? format : default_format(type)

  def stored?(type) = STORED.include?(type)

  # ── Checking a plain value ──────────────────────────────────────────────

  def short_text?(value, pattern = nil)
    value.is_a?(String) && value.length <= MAX_SHORT_TEXT && (pattern.nil? || value.match?(pattern))
  end

  def number_in?(value, range)
    value.is_a?(Numeric) && value.finite? && range.cover?(value)
  end

  def integer_in?(value, range) = value.is_a?(Integer) && range.cover?(value)

  # At most two decimals, and small enough that floating point stays exact.
  def money?(value)
    number_in?(value, -MAX_NUMBER..MAX_NUMBER) && value.round(2) == value
  end

  def date?(value)
    value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}\z/) && Date.iso8601(value).iso8601 == value
  rescue ArgumentError
    false
  end

  def datetime?(value)
    return false unless value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/)

    DateTime.iso8601(value)
    true
  rescue ArgumentError
    false
  end

  # Whether a plain value fits a type. `options` are the field's choices.
  # Linked types are only checked for their shape here; TableCell checks the rest.
  def valid?(type, value, options: [])
    case type
    when "text" then value.is_a?(String)
    when "long_text" then value.is_a?(String) && value.length <= MAX_LONG_TEXT
    when "integer" then value.is_a?(Integer)
    when "number" then value.is_a?(Numeric) && value.finite?
    when "boolean" then value == true || value == false
    when "date" then date?(value)
    when "datetime" then datetime?(value)
    when "email" then short_text?(value, EMAIL)
    when "phone" then value.is_a?(String) && value.match?(PHONE)
    when "url" then value.is_a?(String) && value.length <= 2048 && value.match?(URL)
    when "username" then short_text?(value, USERNAME)
    when "person_name" then short_text?(value, PERSON_NAME)
    when "alphanumeric" then short_text?(value, ALPHANUMERIC)
    when "color" then short_text?(value, COLOR)
    when "money" then money?(value)
    when "mileage" then number_in?(value, 0..MAX_NUMBER)
    when "percent" then number_in?(value, 0..100)
    when "rating" then integer_in?(value, RATING_RANGE)
    when "month" then integer_in?(value, 1..12)
    when "year" then integer_in?(value, 1000..9999)
    when "single_select" then value.is_a?(String) && options.include?(value)
    when "multi_select" then multi_select?(value, options)
    when "relation" then value.nil?
    when "person", "file" then value.is_a?(Integer) && value.positive?
    when "files" then value.is_a?(Array) && value.all? { |id| id.is_a?(Integer) && id.positive? }
    when "auto_number" then value.is_a?(Integer) && value.positive?
    else false
    end
  end

  def multi_select?(value, options)
    value.is_a?(Array) && !value.empty? && value.size <= TaskFieldType::MAX_OPTIONS &&
      value.uniq.size == value.size && value.all? { |choice| options.include?(choice) }
  end

  # ── Reading what someone typed or imported into a plain value ───────────
  # Anything that cannot be read is returned unchanged, so validation rejects
  # it. Types not listed (and the original text, number and date types) are
  # stored exactly as given.

  def normalize(type, value)
    case type
    when "email", "url", "username", "alphanumeric", "single_select" then value.is_a?(String) ? value.strip : value
    when "person_name" then value.is_a?(String) ? value.gsub(/\s+/, " ").strip : value
    when "phone" then plain_phone(value)
    when "color" then plain_color(value)
    when "money" then plain_number(value, delete: "$€£¥ ")
    when "mileage" then plain_number(value, suffix: /\s*(mi|miles|km|kilometers)\z/i)
    when "percent" then plain_number(value, delete: "% ")
    when "rating", "year" then plain_integer(value)
    when "month" then plain_month(value)
    when "multi_select" then plain_choices(value)
    else value
    end
  end

  def plain_phone(value)
    return value unless value.is_a?(String)

    text = value.strip
    text.match?(PHONE_TEXT) ? text.gsub(/[\s().-]/, "") : text
  end

  def plain_color(value)
    return value unless value.is_a?(String)

    text = value.strip.downcase
    text.match?(/\A\h{6}\z/) ? "##{text}" : text
  end

  def plain_number(value, delete: "", suffix: nil)
    return value unless value.is_a?(String)

    text = value.strip
    text = text.sub(suffix, "") if suffix
    text = text.delete(delete) unless delete.empty?
    return value unless text.length <= 20 && text.match?(NUMBER_TEXT) && text.match?(/\d/)

    number = text.delete(",").to_f
    number == number.to_i ? number.to_i : number
  end

  def plain_integer(value)
    value.is_a?(String) && value.strip.match?(/\A\d{1,9}\z/) ? value.strip.to_i : value
  end

  def plain_month(value)
    return value unless value.is_a?(String)

    text = value.strip
    return text.to_i if text.match?(/\A\d{1,2}\z/)

    index = MONTH_NAMES.index { |name| name.casecmp?(text) || name[0, 3].casecmp?(text) }
    index ? index + 1 : value
  end

  # A list of choices, or a comma separated text of them, tidied like tags.
  def plain_choices(value)
    list = value.is_a?(String) ? value.split(",") : value
    TaskFieldType.tidy_labels(list)
  end

  # ── Showing a plain value in its format ─────────────────────────────────
  # Nil when the value is shown as it is stored (the web app then prints it).

  def display(type, format, value)
    return nil if value.nil?

    format = format_for(type, format)
    case type
    when "integer", "number" then format == "commas" ? group_digits(number_text(value)) : nil
    when "money" then money_text(value, CURRENCIES.fetch(format))
    when "mileage" then "#{group_digits(number_text(value))} #{format == 'kilometers' ? 'km' : 'mi'}"
    when "percent" then "#{number_text(value)}%"
    when "phone" then phone_text(value, format)
    when "rating" then format == "number" ? "#{value} / #{RATING_RANGE.max}" : "★" * value + "☆" * (RATING_RANGE.max - value)
    when "month" then month_text(value, format)
    when "auto_number" then format == "padded" ? value.to_s.rjust(4, "0") : nil
    when "multi_select" then value.join(", ")
    when "created_time", "updated_time" then time_text(value, format)
    end
  end

  # 12 for 12.0, otherwise the number as Ruby prints it.
  def number_text(value) = value == value.to_i ? value.to_i.to_s : value.to_s

  def group_digits(text)
    text.sub(/\A(-?)(\d+)/) { "#{Regexp.last_match(1)}#{Regexp.last_match(2).reverse.scan(/\d{1,3}/).join(',').reverse}" }
  end

  # Money rounds half up on whole cents (or whole units for yen), the same way
  # in Ruby and in the browser, whatever the printf of either does.
  def money_text(value, currency)
    sign = value.negative? ? "-" : ""
    amount = value.abs
    body =
      if currency[:decimals].zero?
        group_digits((amount + 0.5).floor.to_s)
      else
        cents = (amount * 100).round
        "#{group_digits((cents / 100).to_s)}.#{(cents % 100).to_s.rjust(2, '0')}"
      end
    "#{sign}#{currency[:symbol]}#{body}"
  end

  # Ten digits are a US number; a leading 1 (with or without +) is the country
  # code. Anything else is shown as stored.
  def phone_text(value, format)
    digits = value.delete("+")
    if digits.length == 10 && !value.start_with?("+")
      prefix = ""
      national = digits
    elsif digits.length == 11 && digits.start_with?("1")
      prefix = "+1 "
      national = digits[1..]
    else
      return value
    end
    area, exchange, line = national[0, 3], national[3, 3], national[6, 4]
    format == "dashes" ? "#{prefix}#{area}-#{exchange}-#{line}" : "#{prefix}(#{area}) #{exchange}-#{line}"
  end

  def month_text(value, format)
    name = MONTH_NAMES.fetch(value - 1)
    case format
    when "short" then name[0, 3]
    when "number" then value.to_s.rjust(2, "0")
    else name
    end
  end

  # "2026-11-07T14:30:00Z" as "2026-11-07 14:30" or "2026-11-07" (UTC).
  def time_text(value, format)
    return value unless value.is_a?(String) && value.length >= 16

    format == "date" ? value[0, 10] : "#{value[0, 10]} #{value[11, 5]}"
  end
end

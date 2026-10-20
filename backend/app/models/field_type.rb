# Validation rule per collection field type, in one place so cells, import and
# the API agree. Each rule takes the stored JSON value and says if it is valid.
# Types borrowed from jandi; credit card, CVV and password are left out on
# purpose: a collection shouldn't store card numbers or passwords.
module FieldType
  EMAIL = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
  PHONE = /\A\+?[\d\s().-]{7,20}\z/
  URL = %r{\Ahttps?://[^\s]+\z}
  USERNAME = /\A[A-Za-z0-9_.-]{3,30}\z/
  PERSON_NAME = /\A[[:alpha:]][[:alpha:]\s'.-]*\z/
  ALPHANUMERIC = /\A[A-Za-z0-9]+\z/
  VIN = /\A[A-HJ-NPR-Z0-9]{17}\z/i
  COLOR = /\A#\h{6}\z/

  def self.string_matching(pattern) = ->(v) { v.is_a?(String) && v.match?(pattern) }
  def self.number_between(range) = ->(v) { v.is_a?(Numeric) && v.finite? && range.cover?(v) }
  def self.integer_between(range) = ->(v) { v.is_a?(Integer) && range.cover?(v) }

  RULES = {
    "long_text" => ->(v) { v.is_a?(String) },
    "email" => string_matching(EMAIL),
    "phone" => string_matching(PHONE),
    "url" => string_matching(URL),
    "username" => string_matching(USERNAME),
    "person_name" => string_matching(PERSON_NAME),
    "alphanumeric" => string_matching(ALPHANUMERIC),
    "vin" => string_matching(VIN),
    "color" => string_matching(COLOR),
    "money" => ->(v) { v.is_a?(Numeric) && v.finite? },
    "mileage" => number_between(0..Float::INFINITY),
    "percent" => number_between(0..100),
    "rating" => integer_between(1..5),
    "month" => integer_between(1..12),
    "year" => integer_between(1000..9999),
    # A place as typed (an address or a name); coordinates are not stored.
    "location" => ->(v) { v.is_a?(String) && v.strip.length.between?(1, 500) },
    # ISO 3166-1 alpha-2, such as "US".
    "country" => ->(v) { v.is_a?(String) && TZInfo::Country.all_codes.include?(v) },
    # An IANA time zone such as "America/New_York"; the grid shows its local time.
    "timezone" => ->(v) { v.is_a?(String) && TZInfo::Timezone.all_identifiers.include?(v) }
  }.freeze

  TYPES = RULES.keys.freeze

  def self.valid?(type, value)
    RULES.fetch(type).call(value)
  end
end

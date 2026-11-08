# A custom paragraph style a person defines for themselves: a name, the
# built-in style it builds on (`base`) and a small set of formatting
# `properties` laid on top of it. It belongs to the user, not to a Space, so it
# is on their style list in every document. A document paragraph refers to it
# as "custom-<id>" and nothing else is stored in the document: whoever opens the
# document reads the definition of the styles it uses (DocumentParagraphStylesController),
# so editing a style restyles every paragraph that uses it (see
# docs/features/paragraph_styles.md).
#
# The allowed values are mirrored in frontend/src/data/customParagraphStyle.ts;
# KEEP IN SYNC.
class ParagraphStyle < ApplicationRecord
  # The built-in paragraph styles a custom style can build on (headings are
  # heading nodes, not styled paragraphs, so they are not offered).
  BASES = %w[body title subtitle quote caption monospace].freeze
  # The labels of the built-in styles, which a custom style may not reuse.
  BUILT_IN_NAMES = [ "Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3", "Body", "Quote", "Caption", "Monospace" ].freeze

  FONTS = %w[sans serif mono].freeze
  WEIGHTS = [ 400, 500, 600, 700 ].freeze
  ALIGNMENTS = %w[left center right justify].freeze
  SIZES = (8..96)
  # Line spacing, as a multiple of the font size.
  SPACINGS = (1.0..3.0)
  COLOR = /\A#\h{6}\z/

  # The properties a style can set, each with the check its value must pass.
  PROPERTY_RULES = {
    "font" => ->(value) { FONTS.include?(value) },
    "size" => ->(value) { value.is_a?(Integer) && SIZES.cover?(value) },
    "weight" => ->(value) { WEIGHTS.include?(value) },
    "color" => ->(value) { value.is_a?(String) && value.match?(COLOR) },
    "spacing" => ->(value) { value.is_a?(Numeric) && SPACINGS.cover?(value) },
    "align" => ->(value) { ALIGNMENTS.include?(value) }
  }.freeze
  PROPERTY_KEYS = PROPERTY_RULES.keys.freeze

  MAX_PER_USER = 50

  # A paragraph refers to a custom style as "custom-<id>" in its `style` attribute.
  REFERENCE = /\Acustom-(\d+)\z/

  # The ids of the custom styles the paragraphs of a document refer to, lowest
  # first, from its editor (TipTap) JSON. Pure: it only reads the hash.
  def self.referenced_ids(node)
    ids = []
    if node.is_a?(Hash)
      style = node.dig("attrs", "style") if node["attrs"].is_a?(Hash)
      ids << Regexp.last_match(1).to_i if node["type"] == "paragraph" && style.is_a?(String) && style =~ REFERENCE
      ids.concat(node["content"].flat_map { |child| referenced_ids(child) }) if node["content"].is_a?(Array)
    end
    ids.uniq.sort
  end

  belongs_to :user

  normalizes :name, with: ->(name) { name.squish }
  before_validation :drop_blank_properties

  validates :name, presence: true, length: { maximum: 40 }, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :base, inclusion: { in: BASES }
  validate :name_is_not_built_in
  validate :properties_are_well_formed
  validate :within_the_limit, on: :create

  private

  def drop_blank_properties
    self.properties = properties.stringify_keys.compact_blank if properties.is_a?(Hash)
  end

  def name_is_not_built_in
    errors.add(:name, "is already the name of a built-in style") if name.present? && BUILT_IN_NAMES.any? { |built_in| built_in.casecmp?(name) }
  end

  def properties_are_well_formed
    return errors.add(:base, "Formatting must be an object") unless properties.is_a?(Hash)

    unknown = properties.keys - PROPERTY_KEYS
    errors.add(:base, "Unknown formatting: #{unknown.join(', ')}") if unknown.any?
    properties.slice(*PROPERTY_KEYS).each do |key, value|
      errors.add(:base, "#{key.humanize} is not a valid value") unless PROPERTY_RULES[key].call(value)
    end
  end

  def within_the_limit
    errors.add(:base, "You can have at most #{MAX_PER_USER} custom styles") if user && user.paragraph_styles.count >= MAX_PER_USER
  end
end

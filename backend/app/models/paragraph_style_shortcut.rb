# A keystroke a person assigned to a paragraph style: one of the built-in style
# ids, or "custom-<id>" for one of their own styles. `keys` names the chord as
# "Ctrl-Mod-Alt-Shift-<key>" with only the modifiers it uses, in that order:
# Mod is ⌘ on a Mac and Ctrl elsewhere, Ctrl is the Control key beside it on a
# Mac. Every chord needs Mod, so plain typing is never taken. One keystroke
# per style and one style per keystroke, per person.
#
# The built-in ids and the chord format are mirrored in
# frontend/src/data/paragraphStyleShortcut.ts; KEEP IN SYNC.
class ParagraphStyleShortcut < ApplicationRecord
  BUILT_IN_STYLES = %w[title subtitle heading1 heading2 heading3 body quote caption monospace].freeze
  KEYS = /\A(?:Ctrl-)?Mod-(?:Alt-)?(?:Shift-)?[a-z0-9]\z/
  CUSTOM_STYLE = /\Acustom-(\d+)\z/

  belongs_to :user

  validates :style, presence: true, uniqueness: { scope: :user_id }
  validates :keys, format: { with: KEYS, message: "is not a valid keystroke" }, uniqueness: { scope: :user_id, message: "is already assigned to another style" }
  validate :style_exists

  # Drops a custom style's keystroke along with the style.
  def self.forget_custom_style(user_id, style_id)
    where(user_id: user_id, style: "custom-#{style_id}").delete_all
  end

  private

  def style_exists
    return if style.blank? || BUILT_IN_STYLES.include?(style)

    id = CUSTOM_STYLE.match(style)&.captures&.first
    errors.add(:style, "is not one of your styles") unless id && user&.paragraph_styles&.exists?(id.to_i)
  end
end

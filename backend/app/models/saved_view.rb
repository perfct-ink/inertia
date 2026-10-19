# A saved set of choices for a page (which page, and the page's own config).
# Private to its owner unless shared with the Space.
class SavedView < ApplicationRecord
  PAGES = %w[task_table].freeze

  belongs_to :workspace
  belongs_to :user

  validates :name, presence: true, length: { maximum: 80 }
  validates :page, inclusion: { in: PAGES }
  validate :config_is_a_hash

  # The views a person sees on a page: their own plus everything shared.
  scope :visible_to, ->(user) { where(shared: true).or(where(user_id: user.id)) }

  private

  def config_is_a_hash
    errors.add(:config, "must be an object") unless config.is_a?(Hash)
  end
end

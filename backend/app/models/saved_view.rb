# A saved set of choices for one page (which page, and the page's own settings:
# sort, grouping, filter, zoom, ...). Private to its owner unless shared with
# the Space. Anyone who can see a view can apply it, and any member of the Space
# (viewers too, Alex's decision of 2026-11-09) can save one; only its owner
# changes it, or a Space admin when it is shared (see Api::V1::SavedViewsController).
class SavedView < ApplicationRecord
  # The pages that keep views. Keep in step with SAVED_VIEW_PAGES in
  # frontend/src/data/savedView.ts.
  PAGES = %w[task_table pivot calendar gantt tasks timeline workload].freeze
  MAX_CONFIG_BYTES = 10_000

  belongs_to :workspace
  belongs_to :user

  validates :name, presence: true, length: { maximum: 80 }
  validates :page, inclusion: { in: PAGES }
  validate :config_is_a_small_object
  validate :page_does_not_change, on: :update

  # The views a person sees: their own plus everything shared with the Space.
  scope :visible_to, ->(user) { where(shared: true).or(where(user_id: user.id)) }

  # Whether `membership` (a WorkspaceAccess or WorkspaceMembership) may edit or
  # delete this view: its owner always (whatever their role), and an admin when
  # it is shared.
  def changeable_by?(user, membership)
    user_id == user.id || (shared? && membership.can_manage?)
  end

  private

  def config_is_a_small_object
    if !config.is_a?(Hash)
      errors.add(:config, "must be an object")
    elsif config.to_json.bytesize > MAX_CONFIG_BYTES
      errors.add(:config, "is too large")
    end
  end

  def page_does_not_change
    errors.add(:page, "cannot be changed") if page_changed?
  end
end

# An idea or feature request. A person promotes it to an epic or initiative
# (once) or declines it; the idea keeps a pointer to what it became.
class Idea < ApplicationRecord
  PROMOTABLE = { "epic" => Epic, "initiative" => Initiative }.freeze

  belongs_to :workspace
  belongs_to :submitted_by, class_name: "User", optional: true

  enum :status, { open: 0, promoted: 1, declined: 2 }, prefix: :status

  validates :title, presence: true

  # Creates the epic or initiative from this idea's title and marks it promoted.
  # Initiatives keep the description; epics have none. Returns the new record.
  def promote!(kind)
    model = PROMOTABLE.fetch(kind) { raise ArgumentError, "can only promote to an epic or initiative" }
    raise ArgumentError, "already promoted" if status_promoted?
    transaction do
      attrs = { workspace: workspace, title: title }
      attrs[:description] = description if model == Initiative
      created = model.create!(attrs)
      update!(status: :promoted, promoted_type: model.name, promoted_id: created.id)
      created
    end
  end

  def promoted_record
    promoted_type&.safe_constantize&.find_by(id: promoted_id)
  end
end

# One entry in an item's activity log: who created or changed it, when, and
# what changed. Written by Auditable; entries are never edited through the app
# and go when their item does.
#
# field_changes maps a field name to its [from, to] values (an association is
# the associated record's name), or to nil when the field changed but its value
# is not kept (a long description, a document's content).
class Activity < ApplicationRecord
  # The models that include Auditable (a test keeps this in step).
  SUBJECT_TYPES = %w[Task Document Epic Initiative Milestone].freeze
  # How many entries the API returns for one item, newest first.
  PAGE_SIZE = 100
  # Edits that only touch valueless fields (a document autosaves while someone
  # types) by the same person within this long fold into one entry.
  COALESCE_WINDOW = 10.minutes

  belongs_to :subject, polymorphic: true
  belongs_to :actor, class_name: "User", optional: true

  enum :action, { created: 0, updated: 1 }

  validates :subject_type, inclusion: { in: SUBJECT_TYPES }

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }

  # Appends an entry for `subject`, or extends the person's latest one when this
  # is a continuation of the same quiet edit (see COALESCE_WINDOW). The entry's
  # time then moves up to the latest edit.
  def self.log(subject:, action:, actor: nil, field_changes: {})
    entry = new(subject: subject, action: action, actor: actor, field_changes: field_changes)
    previous = where(subject: subject).newest_first.first if entry.quiet?

    if previous&.continued_by?(entry)
      previous.update!(created_at: Time.current)
    else
      entry.save!
    end
  end

  # An update whose every change is a valueless field.
  def quiet?
    updated? && field_changes.present? && field_changes.values.all?(&:nil?)
  end

  def continued_by?(entry)
    quiet? && actor_id == entry.actor_id && field_changes.keys == entry.field_changes.keys && created_at > COALESCE_WINDOW.ago
  end
end

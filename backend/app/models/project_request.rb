# Project intake. Any member who can write submits a request; an admin or
# owner approves it, which creates the project (a folder with kind "project")
# under the document root, or declines it with a reason. A decision is final
# except that a declined request can be reopened.
class ProjectRequest < ApplicationRecord
  belongs_to :workspace
  belongs_to :requested_by, class_name: "User", optional: true
  belongs_to :decided_by, class_name: "User", optional: true
  # The folder approval created. Cleared by the database if the folder is deleted.
  belongs_to :project, class_name: "Folder", optional: true

  enum :status, { pending: 0, approved: 1, declined: 2 }, validate: true
  enum :priority, { low: 0, medium: 1, high: 2 }, prefix: true, validate: true

  validates :name, presence: true
  validates :decision_note, presence: true, if: :declined?
  validate :target_date_not_before_start_date

  def approve!(by:, note: nil)
    transaction do
      require_status!(:pending, "Only a pending request can be approved")
      folder = workspace.folders.create!(name: name, kind: :project)
      update!(status: :approved, project: folder, decided_by: by, decided_at: Time.current, decision_note: note.presence)
    end
  end

  def decline!(by:, note:)
    transaction do
      require_status!(:pending, "Only a pending request can be declined")
      update!(status: :declined, decided_by: by, decided_at: Time.current, decision_note: note.presence)
    end
  end

  def reopen!
    transaction do
      require_status!(:declined, "Only a declined request can be reopened")
      update!(status: :pending, decided_by: nil, decided_at: nil, decision_note: nil)
    end
  end

  private

  # Re-reads the row under a lock so two admins deciding at once cannot both
  # win (approving twice would create two projects).
  def require_status!(expected, message)
    lock!
    return if status == expected.to_s
    errors.add(:base, message)
    raise ActiveRecord::RecordInvalid, self
  end

  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
